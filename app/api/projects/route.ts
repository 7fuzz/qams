import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';
import { canManageProject } from '@/lib/auth-utils';

import { createPaginatedResponse } from '@/lib/pagination-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || undefined;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        const { data: projects, total } = await ProjectModel.findAll({
            search,
            sortBy,
            sortOrder
        }, limit, offset);

        return NextResponse.json(createPaginatedResponse(projects, total, page, limit));
    } catch {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, version, description, lead_developer_id } = await request.json() as { name: string, version?: string, description?: string, lead_developer_id?: string };
        const projectId = await ProjectModel.create({
            name,
            version,
            description,
            lead_developer_id: lead_developer_id || session.user_id
        });

        await logActivity(session.user_id, 'CREATE', 'PROJECT', projectId, { name });
        return NextResponse.json({ project_id: projectId, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { project_id, name, version, description, lead_developer_id } = await request.json() as { project_id: string, name: string, version: string, description?: string, lead_developer_id?: string };
        
        if (!await canManageProject(session, project_id)) {
            return NextResponse.json({ error: "Forbidden: You don't have access to this project" }, { status: 403 });
        }

        await ProjectModel.update(project_id, {
            name,
            version,
            description,
            lead_developer_id
        });

        await logActivity(session.user_id, 'UPDATE', 'PROJECT', project_id, { name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        if (!await canManageProject(session, id)) {
            return NextResponse.json({ error: "Forbidden: You don't have access to this project" }, { status: 403 });
        }

        await ProjectModel.delete(id);
        await logActivity(session.user_id, 'DELETE', 'PROJECT', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

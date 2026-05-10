import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';

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
        const { name, version, description } = await request.json();
        const projectId = await ProjectModel.create({
            name,
            version,
            description,
            owner_id: session.user_id
        });
        
        logActivity(session.user_id, 'CREATE', 'PROJECT', projectId, { name, version });
        
        return NextResponse.json({ project_id: projectId, name, version, description });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { project_id, name, version, description } = await request.json();
        await ProjectModel.update(project_id, { name, version, description });
        
        await logActivity(session.user_id, 'UPDATE', 'PROJECT', project_id, { name, version });
        
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
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await ProjectModel.delete(id);
        await logActivity(session.user_id, 'DELETE', 'PROJECT', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

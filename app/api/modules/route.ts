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
    const projectId = searchParams.get('projectId') || undefined;
    const moduleIdsParam = searchParams.get('moduleIds');
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || undefined;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const moduleIds = moduleIdsParam ? moduleIdsParam.split(',') : undefined;

    try {
        const { data: modules, total } = await ProjectModel.findModules({
            projectId,
            moduleIds,
            search,
            sortBy,
            sortOrder
        }, limit, offset);

        return NextResponse.json(createPaginatedResponse(modules, total, page, limit));
    } catch {
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { project_id, name, description, responsible_id, sla_date, actual_date } = await request.json();
        
        if (!await canManageProject(session, project_id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const moduleId = await ProjectModel.createModule({
            project_id,
            name,
            description,
            responsible_id,
            sla_date,
            actual_date
        });
        
        await logActivity(session.user_id, 'CREATE', 'MODULE', moduleId, { name, project_id });
        
        return NextResponse.json({ module_id: moduleId, project_id, name, description });
    } catch {
        return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { module_id, name, description, responsible_id, sla_date, actual_date } = await request.json();
        
        // Fetch module to get project_id
        const { data: modules } = await ProjectModel.findModules({ moduleIds: [module_id] });
        if (modules.length === 0) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        
        if (!await canManageProject(session, modules[0].project_id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await ProjectModel.updateModule(module_id, {
            name,
            description,
            responsible_id,
            sla_date,
            actual_date
        });
        
        await logActivity(session.user_id, 'UPDATE', 'MODULE', module_id, { name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
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
        // Fetch module to get project_id
        const { data: modules } = await ProjectModel.findModules({ moduleIds: [id] });
        if (modules.length === 0) return NextResponse.json({ error: "Module not found" }, { status: 404 });
        
        if (!await canManageProject(session, modules[0].project_id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await ProjectModel.deleteModule(id);
        await logActivity(session.user_id, 'DELETE', 'MODULE', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';

export async function GET() {
    try {
        const projects = await ProjectModel.findAll();
        return NextResponse.json(projects);
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
        
        logActivity(session.user_id, 'UPDATE', 'PROJECT', project_id, { name, version });
        
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
        logActivity(session.user_id, 'DELETE', 'PROJECT', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

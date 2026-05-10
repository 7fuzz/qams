import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ProjectModel } from '@/models/Project';

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: "Missing Project ID" }, { status: 400 });

    try {
        const users = await ProjectModel.getAssignedUsers(projectId);
        return NextResponse.json(users);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, user_id } = await request.json() as { project_id: string, user_id: string };
        
        // Check if user has permission to manage projects
        const hasBypass = session.permissions.includes('projects:manage_all');
        const isAssigned = await ProjectModel.isUserAssigned(project_id, session.user_id);
        
        if (!hasBypass && !isAssigned) {
            return NextResponse.json({ error: "Forbidden: You don't have access to this project" }, { status: 403 });
        }

        await ProjectModel.assignUser(project_id, user_id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');

    if (!projectId || !userId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    try {
        const hasBypass = session.permissions.includes('projects:manage_all');
        const isAssigned = await ProjectModel.isUserAssigned(projectId, session.user_id);
        
        if (!hasBypass && !isAssigned) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await ProjectModel.unassignUser(projectId, userId);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to unassign user' }, { status: 500 });
    }
}

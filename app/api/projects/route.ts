import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';

export async function GET() {
    try {
        const projects = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.user_id').all();
        return NextResponse.json(projects);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name, version } = await request.json();
        const info = db.prepare('INSERT INTO projects (name, version, owner_id) VALUES (?, ?, ?)')
            .run(name, version, session.user_id);
        
        const projectId = info.lastInsertRowid;
        logActivity(session.user_id, 'CREATE', 'PROJECT', projectId as number, { name, version });
        
        return NextResponse.json({ project_id: projectId, name, version });
    } catch {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, name, version } = await request.json();
        db.prepare('UPDATE projects SET name = ?, version = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
            .run(name, version, project_id);
        
        logActivity(session.user_id, 'UPDATE', 'PROJECT', project_id, { name, version });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM projects WHERE project_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'PROJECT', Number(id));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

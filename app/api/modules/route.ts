import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    try {
        let query = 'SELECT * FROM modules';
        const params: string[] = [];
        if (projectId) {
            query += ' WHERE project_id = ?';
            params.push(projectId);
        }
        const modules = db.prepare(query).all(...params);
        return NextResponse.json(modules);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, name, description } = await request.json();
        const moduleId = generateId();
        db.prepare('INSERT INTO modules (module_id, project_id, name, description) VALUES (?, ?, ?, ?)')
            .run(moduleId, project_id, name, description);
        
        logActivity(session.user_id, 'CREATE', 'MODULE', moduleId, { name, project_id });
        
        return NextResponse.json({ module_id: moduleId, project_id, name, description });
    } catch {
        return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { module_id, name, description } = await request.json();
        db.prepare('UPDATE modules SET name = ?, description = ? WHERE module_id = ?').run(name, description, module_id);
        logActivity(session.user_id, 'UPDATE', 'MODULE', module_id, { name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM modules WHERE module_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'MODULE', id!);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
    }
}

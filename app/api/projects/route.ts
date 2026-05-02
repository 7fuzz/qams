import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

export async function GET() {
    try {
        const projects = db.prepare(`
            SELECT 
                p.*, 
                u.name as owner_name,
                (SELECT COUNT(*) FROM issues i 
                 JOIN test_cases tc ON i.test_case_id = tc.test_case_id
                 JOIN scenarios s ON tc.scenario_id = s.scenario_id
                 JOIN modules m ON s.module_id = m.module_id
                 WHERE m.project_id = p.project_id AND i.status != 'Closed') as open_issues_count
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id
        `).all();
        return NextResponse.json(projects);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name, version, description } = await request.json();
        const projectId = generateId();
        db.prepare('INSERT INTO projects (project_id, name, version, description, owner_id) VALUES (?, ?, ?, ?, ?)')
            .run(projectId, name, version || '1.0.0', description || null, session.user_id);
        
        logActivity(session.user_id, 'CREATE', 'PROJECT', projectId, { name, version });
        
        return NextResponse.json({ project_id: projectId, name, version, description });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, name, version, description } = await request.json();
        db.prepare('UPDATE projects SET name = ?, version = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
            .run(name, version, description, project_id);
        
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
        logActivity(session.user_id, 'DELETE', 'PROJECT', id!);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

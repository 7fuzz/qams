import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get('releaseId');

    try {
        const changes = db.prepare(`
            SELECT rc.*, i.title as issue_title, i.status as issue_status, m.name as module_name
            FROM release_changes rc
            LEFT JOIN issues i ON rc.issue_id = i.issue_id
            LEFT JOIN modules m ON rc.module_id = m.module_id
            WHERE rc.release_id = ?
            ORDER BY rc.created_at ASC
        `).all(releaseId);
        return NextResponse.json(changes);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch release changes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { release_id, module_id, type, title, description, issue_id } = await request.json();
        const changeId = generateId();
        
        db.prepare(`
            INSERT INTO release_changes (change_id, release_id, module_id, type, title, description, issue_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(changeId, release_id, module_id || null, type, title, description || null, issue_id || null);
        
        return NextResponse.json({ change_id: changeId, title });
    } catch {
        return NextResponse.json({ error: 'Failed to add change' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { change_id, module_id, type, title, description, issue_id } = await request.json();
        
        db.prepare(`
            UPDATE release_changes 
            SET module_id = ?, type = ?, title = ?, description = ?, issue_id = ?
            WHERE change_id = ?
        `).run(module_id || null, type, title, description || null, issue_id || null, change_id);
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update change' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM release_changes WHERE change_id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete change' }, { status: 500 });
    }
}

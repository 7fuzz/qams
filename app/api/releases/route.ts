import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    try {
        let query = 'SELECT * FROM releases';
        const params: string[] = [];

        if (projectId) {
            query += ' WHERE project_id = ?';
            params.push(projectId);
        }

        query += ' ORDER BY created_at DESC';
        const releases = db.prepare(query).all(...params);
        return NextResponse.json(releases);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, version_name, status, target_date, description } = await request.json();
        const releaseId = generateId();
        
        db.prepare(`
            INSERT INTO releases (release_id, project_id, version_name, status, target_date, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(releaseId, project_id, version_name, status || 'Planning', target_date || null, description || null);
        
        return NextResponse.json({ release_id: releaseId, version_name });
    } catch {
        return NextResponse.json({ error: 'Failed to create release' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { release_id, version_name, status, target_date, description } = await request.json();
        
        db.prepare(`
            UPDATE releases 
            SET version_name = ?, status = ?, target_date = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE release_id = ?
        `).run(version_name, status, target_date || null, description || null, release_id);
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update release' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        db.prepare('DELETE FROM releases WHERE release_id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete release' }, { status: 500 });
    }
}

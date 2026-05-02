import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('issueId');

    try {
        const notes = db.prepare(`
            SELECT n.*, u.name as user_name 
            FROM issue_notes n 
            JOIN users u ON n.user_id = u.user_id 
            WHERE n.issue_id = ? 
            ORDER BY n.created_at ASC
        `).all(issueId);
        return NextResponse.json(notes);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { issue_id, content } = await request.json();
        const noteId = generateId();
        db.prepare('INSERT INTO issue_notes (note_id, issue_id, user_id, content) VALUES (?, ?, ?, ?)')
            .run(noteId, issue_id, session.user_id, content);
        
        return NextResponse.json({ note_id: noteId, content, user_name: session.name });
    } catch {
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }
}

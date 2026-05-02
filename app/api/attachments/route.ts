import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');

    try {
        const attachments = db.prepare('SELECT * FROM attachments WHERE entity_id = ? AND entity_type = ? ORDER BY created_at ASC')
            .all(entityId, entityType);
        return NextResponse.json(attachments);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { entity_id, entity_type, url, name } = await request.json();
        const id = generateId();
        db.prepare('INSERT INTO attachments (attachment_id, entity_id, entity_type, url, name) VALUES (?, ?, ?, ?, ?)')
            .run(id, entity_id, entity_type, url, name || url);
        
        return NextResponse.json({ attachment_id: id, url, name });
    } catch {
        return NextResponse.json({ error: 'Failed to add attachment' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM attachments WHERE attachment_id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }
}

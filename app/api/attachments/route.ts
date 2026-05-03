import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { AttachmentModel } from '@/models/Attachment';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');

    if (!entityId || !entityType) {
        return NextResponse.json({ error: 'Missing entityId or entityType' }, { status: 400 });
    }

    try {
        const attachments = AttachmentModel.findAll(entityId, entityType);
        return NextResponse.json(attachments);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const result = AttachmentModel.create(body);
        return NextResponse.json(result);
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
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        AttachmentModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }
}

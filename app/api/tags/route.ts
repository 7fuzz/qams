import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TagModel } from '@/models/Tag';
import { logActivity } from '@/lib/logger';

export async function GET() {
    try {
        const tags = await TagModel.findAll();
        return NextResponse.json(tags);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tags:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await request.json();
        const id = await TagModel.create(data);
        await logActivity(session.user_id, 'CREATE', 'TAG', id, { name: data.name });
        return NextResponse.json({ success: true, tag_id: id });
    } catch {
        return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tags:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { tag_id, ...data } = await request.json();
        if (!tag_id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        
        await TagModel.update(tag_id, data);
        await logActivity(session.user_id, 'UPDATE', 'TAG', tag_id, { name: data.name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tags:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        const tag = await TagModel.findById(id);
        await TagModel.delete(id);
        await logActivity(session.user_id, 'DELETE', 'TAG', id, { name: tag?.name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }
}

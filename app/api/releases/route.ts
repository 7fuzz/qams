import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ReleaseModel } from '@/models/Release';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    try {
        const releases = await ReleaseModel.findAll(projectId);
        return NextResponse.json(releases);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const releaseId = await ReleaseModel.create(body);
        return NextResponse.json({ release_id: releaseId, version_name: body.version_name });
    } catch {
        return NextResponse.json({ error: 'Failed to create release' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        await ReleaseModel.update(body.release_id, body);
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
        await ReleaseModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete release' }, { status: 500 });
    }
}

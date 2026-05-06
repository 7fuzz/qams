import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ReleaseModel } from '@/models/Release';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get('releaseId');

    try {
        if (!releaseId) return NextResponse.json([]);
        const changes = await ReleaseModel.findChanges(releaseId);
        return NextResponse.json(changes);
    } catch (error) {
        console.error('Fetch Changes Error:', error);
        return NextResponse.json({ error: 'Failed to fetch release changes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const changeId = await ReleaseModel.createChange(body);
        return NextResponse.json({ change_id: changeId, title: body.title });
    } catch (error) {
        console.error('POST Change Error:', error);
        return NextResponse.json({ error: 'Failed to add change' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        await ReleaseModel.updateChange(body.change_id, body);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT Change Error:', error);
        return NextResponse.json({ error: 'Failed to update change' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        await ReleaseModel.deleteChange(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete change' }, { status: 500 });
    }
}

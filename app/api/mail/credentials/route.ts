import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { MailModel } from '@/models/Mail';
import { logActivity } from '@/lib/logger';

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const credentials = await MailModel.getAllCredentials();
        return NextResponse.json(credentials);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    // For now, only users with users:manage (Admin) can create credentials
    if (!session.isLoggedIn || !session.permissions.includes('users:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await request.json();
        const id = await MailModel.createCredential(data);
        await logActivity(session.user_id, 'CREATE', 'MAIL_CREDENTIAL', id, { name: data.name });
        return NextResponse.json({ credential_id: id });
    } catch {
        return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('users:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await MailModel.deleteCredential(id);
        await logActivity(session.user_id, 'DELETE', 'MAIL_CREDENTIAL', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
    }
}

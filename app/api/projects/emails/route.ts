import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { MailModel } from '@/models/Mail';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        let result;
        if (!projectId || projectId === 'all') {
            result = await MailModel.getAllEmails(limit, offset);
        } else {
            result = await MailModel.getEmailsForProject(projectId, limit, offset);
        }
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await MailModel.deleteEmail(id);
        await logActivity(session.user_id, 'DELETE', 'CAUGHT_EMAIL', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
    }
}

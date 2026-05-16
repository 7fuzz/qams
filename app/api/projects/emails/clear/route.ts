import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { MailModel } from '@/models/Mail';
import { logActivity } from '@/lib/logger';

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    try {
        if (!projectId) return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });
        await MailModel.clearEmailsForProject(projectId);
        await logActivity(session.user_id, 'CLEAR', 'CAUGHT_EMAILS', projectId);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to clear emails' }, { status: 500 });
    }
}

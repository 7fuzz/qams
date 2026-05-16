import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { MailModel } from '@/models/Mail';
import { logActivity } from '@/lib/logger';
import db from '@/lib/db';

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const credentialId = searchParams.get('credentialId');

    try {
        if (credentialId) {
            const [rows] = await db.execute(
                `SELECT p.project_id, p.name FROM projects p
                 JOIN project_mail_credentials pmc ON p.project_id = pmc.project_id
                 WHERE pmc.credential_id = ?`,
                [credentialId]
            );
            return NextResponse.json(rows);
        }
        if (!projectId) return NextResponse.json({ error: 'Missing Project ID' }, { status: 400 });
        const credentials = await MailModel.getCredentialsForProject(projectId);
        return NextResponse.json(credentials);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch mail data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { projectId, credentialId } = await request.json();
        await MailModel.assignToProject(projectId, credentialId);
        await logActivity(session.user_id, 'ASSIGN', 'MAIL_CREDENTIAL', credentialId, { projectId });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to assign credential' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('projects:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const credentialId = searchParams.get('credentialId');
    
    try {
        if (!projectId || !credentialId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        await MailModel.unassignFromProject(projectId, credentialId);
        await logActivity(session.user_id, 'UNASSIGN', 'MAIL_CREDENTIAL', credentialId, { projectId });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to unassign credential' }, { status: 500 });
    }
}

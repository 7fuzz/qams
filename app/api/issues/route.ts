import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { ISSUE_STATUS } from '@/lib/constants';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');

    try {
        let query = `
            SELECT i.*, u.name as reporter_name 
            FROM issues i 
            JOIN users u ON i.reporter_id = u.user_id
        `;
        const params: string[] = [];
        if (testCaseId) {
            query += ' WHERE i.test_case_id = ?';
            params.push(testCaseId);
        }
        query += ' ORDER BY i.created_at DESC';
        const issues = db.prepare(query).all(...params);
        return NextResponse.json(issues);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { test_case_id, title, description, severity } = await request.json();
        const info = db.prepare(`
            INSERT INTO issues (test_case_id, reporter_id, title, description, severity, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(test_case_id, session.user_id, title, description, severity, ISSUE_STATUS.OPEN);
        
        const issueId = info.lastInsertRowid;
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', test_case_id, { issue_id: issueId, title });
        
        return NextResponse.json({ issue_id: issueId, title, status: ISSUE_STATUS.OPEN });
    } catch {
        return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { issue_id, status, severity, title, description } = await request.json();
        db.prepare(`
            UPDATE issues 
            SET status = ?, severity = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE issue_id = ?
        `).run(status, severity, title, description, issue_id);
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
    }
}

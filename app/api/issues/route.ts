import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { ISSUE_STATUS } from '@/lib/constants';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const runId = searchParams.get('runId');

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
        } else if (runId) {
            query += ` WHERE i.test_case_id IN (SELECT test_case_id FROM test_executions WHERE run_id = ?)`;
            params.push(runId);
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
    const { test_case_id, title, description, severity, execution_id } = await request.json();
    const issueId = generateId();
    
    const createTransaction = db.transaction(() => {
        // 1. Create Issue
        db.prepare(`
            INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, title, description, severity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(issueId, test_case_id, execution_id || null, session.user_id, title, description, severity, ISSUE_STATUS.OPEN);

        // 2. Log History
        let runId = null;
        if (execution_id) {
            const exec = db.prepare('SELECT run_id FROM test_executions WHERE execution_id = ?').get(execution_id) as { run_id: string };
            runId = exec.run_id;
        }

        db.prepare(`
            INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(generateId(), issueId, runId, execution_id || null, ISSUE_STATUS.OPEN, session.user_id);

        return issueId;
    });

    const id = createTransaction();
    logActivity(session.user_id, 'CREATE', 'TEST_CASE', test_case_id, { issue_id: id, title });
    
    return NextResponse.json({ issue_id: id, title, status: ISSUE_STATUS.OPEN });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { issue_id, status, severity, title, description, execution_id } = await request.json();
    
    const updateTransaction = db.transaction(() => {
        // 1. Update Issue
        db.prepare(`
            UPDATE issues 
            SET status = ?, severity = ?, title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE issue_id = ?
        `).run(status, severity, title, description, issue_id);

        // 2. Log History entry for status update
        let runId = null;
        if (execution_id) {
            const exec = db.prepare('SELECT run_id FROM test_executions WHERE execution_id = ?').get(execution_id) as { run_id: string };
            runId = exec.run_id;
        }

        db.prepare(`
            INSERT INTO issue_history (history_id, issue_id, run_id, execution_id, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(generateId(), issue_id, runId, execution_id || null, status, session.user_id);
    });

    updateTransaction();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

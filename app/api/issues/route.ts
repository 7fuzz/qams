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
    const projectId = searchParams.get('projectId');

    try {
        let query = '';
        const params: string[] = [];

        if (runId) {
            query = `
                SELECT 
                    i.*,
                    u.name as reporter_name,
                    d.name as developer_name,
                    s.name as solver_name,
                    COALESCE(
                        (SELECT status FROM issue_history h 
                         WHERE h.issue_id = i.issue_id 
                         AND h.timestamp <= (SELECT COALESCE(completed_at, CURRENT_TIMESTAMP) FROM test_runs WHERE run_id = ?) 
                         ORDER BY h.timestamp DESC LIMIT 1),
                        i.status
                    ) as status
                FROM issues i 
                JOIN users u ON i.reporter_id = u.user_id
                LEFT JOIN users d ON i.developer_id = d.user_id
                LEFT JOIN users s ON i.solved_by_id = s.user_id
                WHERE i.test_case_id IN (SELECT test_case_id FROM test_executions WHERE run_id = ?)
            `;
            params.push(runId, runId);
        } else {
            query = `
                SELECT i.*, u.name as reporter_name, d.name as developer_name, s.name as solver_name 
                FROM issues i 
                JOIN users u ON i.reporter_id = u.user_id
                LEFT JOIN users d ON i.developer_id = d.user_id
                LEFT JOIN users s ON i.solved_by_id = s.user_id
                WHERE 1=1
            `;
            if (testCaseId) {
                query += ' AND i.test_case_id = ?';
                params.push(testCaseId);
            } else if (projectId) {
                query += ` AND i.test_case_id IN (
                    SELECT tc.test_case_id 
                    FROM test_cases tc
                    JOIN scenarios sc ON tc.scenario_id = sc.scenario_id
                    JOIN modules m ON sc.module_id = m.module_id
                    WHERE m.project_id = ?
                )`;
                params.push(projectId);
            }
        }

        query += ' ORDER BY i.created_at DESC';
        const issues = db.prepare(query).all(...params);
        return NextResponse.json(issues);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { test_case_id, title, description, severity, execution_id, developer_id } = await request.json();
    const issueId = generateId();
    
    const createTransaction = db.transaction(() => {
        db.prepare(`
            INSERT INTO issues (issue_id, test_case_id, snapshot_execution_id, reporter_id, developer_id, title, description, severity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(issueId, test_case_id, execution_id || null, session.user_id, developer_id || null, title, description, severity, ISSUE_STATUS.OPEN);

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
    const { issue_id, status, severity, title, description, execution_id, developer_id } = await request.json();
    
    const updateTransaction = db.transaction(() => {
        let solved_by_id = null;
        if (status === ISSUE_STATUS.CLOSED) {
            solved_by_id = session.user_id;
        }

        db.prepare(`
            UPDATE issues 
            SET status = ?, severity = ?, title = ?, description = ?, developer_id = ?, solved_by_id = COALESCE(?, solved_by_id), updated_at = CURRENT_TIMESTAMP
            WHERE issue_id = ?
        `).run(status, severity, title, description, developer_id || null, solved_by_id, issue_id);

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

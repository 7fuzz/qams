import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    try {
        let query = 'SELECT tr.*, u.name as tester_name FROM test_runs tr JOIN users u ON tr.tester_id = u.user_id';
        const params: string[] = [];
        if (projectId) {
            query += ' WHERE project_id = ?';
            params.push(projectId);
        }
        query += ' ORDER BY created_at DESC';
        const runs = db.prepare(query).all(...params);
        return NextResponse.json(runs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch test runs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, name, scenario_ids } = await request.json();
        
        // Start a transaction
        const createRun = db.transaction(() => {
            const info = db.prepare('INSERT INTO test_runs (project_id, tester_id, name, status) VALUES (?, ?, ?, ?)')
                .run(project_id, session.user_id, name, 'In Progress');
            
            const runId = info.lastInsertRowid;

            // Get all test cases for the selected scenarios
            const placeholders = scenario_ids.map(() => '?').join(',');
            const testCases = db.prepare(`SELECT test_case_id FROM test_cases WHERE scenario_id IN (${placeholders})`)
                .all(...scenario_ids);

            // Create executions for each test case
            const insertExecution = db.prepare('INSERT INTO test_executions (run_id, test_case_id, status) VALUES (?, ?, ?)');
            for (const tc of testCases) {
                insertExecution.run(runId, tc.test_case_id, 'Pending');
            }

            return runId;
        });

        const runId = createRun();
        logActivity(session.user_id, 'CREATE', 'TEST_RUN', runId as number, { name, project_id });
        
        return NextResponse.json({ run_id: runId, name });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create test run' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'TEST_RUN', Number(id));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete test run' }, { status: 500 });
    }
}

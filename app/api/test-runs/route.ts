import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

interface CountResult {
    total: number;
}

interface TestCaseId {
    test_case_id: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        let baseQuery = `
            FROM test_runs tr 
            JOIN users u ON tr.tester_id = u.user_id
            JOIN projects p ON tr.project_id = p.project_id
            JOIN users po ON p.owner_id = po.user_id
        `;
        const params: string[] = [];
        if (projectId) {
            baseQuery += ' WHERE tr.project_id = ?';
            params.push(projectId);
        }

        // 1. Get total
        const countRes = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params) as CountResult | undefined;
        const total = countRes ? countRes.total : 0;
        
        // 2. Get data
        const runs = db.prepare(`
            SELECT 
                tr.*, 
                u.name as tester_name, 
                p.name as project_name, 
                po.name as project_owner,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id) as total_cases,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Passed') as passed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Failed') as failed_count,
                (SELECT COUNT(*) FROM test_executions WHERE run_id = tr.run_id AND status = 'Pending') as pending_count
            ${baseQuery}
            ORDER BY tr.created_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        return NextResponse.json({
            data: runs,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch test runs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { project_id, name, scenario_ids } = await request.json();
        const runId = generateId();
        
        const createRun = db.transaction(() => {
            db.prepare('INSERT INTO test_runs (run_id, project_id, tester_id, name, status) VALUES (?, ?, ?, ?, ?)')
                .run(runId, project_id, session.user_id, name, 'In Progress');

            const placeholders = scenario_ids.map(() => '?').join(',');
            const testCases = db.prepare(`SELECT test_case_id FROM test_cases WHERE scenario_id IN (${placeholders})`)
                .all(...scenario_ids) as TestCaseId[];

            const insertExecution = db.prepare('INSERT INTO test_executions (execution_id, run_id, test_case_id, status) VALUES (?, ?, ?, ?)');
            for (const tc of testCases) {
                insertExecution.run(generateId(), runId, tc.test_case_id, 'Pending');
            }

            return runId;
        });

        createRun();
        logActivity(session.user_id, 'CREATE', 'TEST_RUN', runId, { name, project_id });
        
        return NextResponse.json({ run_id: runId, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create test run' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { run_id, status } = await request.json();
        
        let updateQuery = 'UPDATE test_runs SET status = ?';
        const params: string[] = [status];

        if (status === 'Completed') {
            updateQuery += ', completed_at = CURRENT_TIMESTAMP';
        }

        updateQuery += ' WHERE run_id = ?';
        params.push(run_id);

        db.prepare(updateQuery).run(...params);
        logActivity(session.user_id, 'UPDATE', 'PROJECT', run_id, { action: 'SET_RUN_STATUS', status });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update test run' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'TEST_RUN', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete test run' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    try {
        const executions = db.prepare(`
            SELECT te.*, tc.title, tc.steps, tc.expected_result, tc.precondition, tc.test_data
            FROM test_executions te
            JOIN test_cases tc ON te.test_case_id = tc.test_case_id
            WHERE te.run_id = ?
        `).all(runId);
        return NextResponse.json(executions);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { execution_id, status, notes, proof_url } = await request.json();
        
        db.prepare(`
            UPDATE test_executions 
            SET status = ?, notes = COALESCE(?, notes), proof_url = COALESCE(?, proof_url), executed_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
        `).run(status, notes || null, proof_url || null, execution_id);

        // Fetch execution details for logging
        const execution = db.prepare('SELECT run_id, test_case_id FROM test_executions WHERE execution_id = ?').get(execution_id) as { run_id: string, test_case_id: string };
        const testCase = db.prepare('SELECT title FROM test_cases WHERE test_case_id = ?').get(execution.test_case_id) as { title: string };

        logActivity(session.user_id, 'UPDATE', 'TEST_CASE', execution.test_case_id, { 
            action: 'EXECUTE',
            run_id: execution.run_id,
            status,
            test_case: testCase.title 
        });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update execution' }, { status: 500 });
    }
}

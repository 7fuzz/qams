import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    try {
        const executions = db.prepare(`
            SELECT te.*, tc.title, tc.steps, tc.expected_result, tc.precondition
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
            SET status = ?, notes = ?, proof_url = ?, executed_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
        `).run(status, notes, proof_url, execution_id);
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update execution' }, { status: 500 });
    }
}

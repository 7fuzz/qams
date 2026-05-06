import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestRunModel } from '@/models/TestRun';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 });

    try {
        const executions = await TestRunModel.findExecutions(runId);
        return NextResponse.json(executions);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { execution_id, status } = body;
        
        await TestRunModel.updateExecution(execution_id, body);

        // Fetch execution details for logging
        const execution = await TestRunModel.findExecutionById(execution_id);
        if (execution) {
            await logActivity(session.user_id, 'UPDATE', 'TEST_CASE', execution.test_case_id, { 
                action: 'EXECUTE',
                run_id: execution.run_id,
                status,
                test_case: execution.title 
            });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update Execution Error:', error);
        return NextResponse.json({ error: 'Failed to update execution' }, { status: 500 });
    }
}

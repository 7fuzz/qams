import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestRunModel } from '@/models/TestRun';
import { logActivity } from '@/lib/logger';
import { createPaginatedResponse } from '@/lib/pagination-utils';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || undefined;
    const search = searchParams.get('search') || undefined;
    
    const status = searchParams.get('status') || undefined;
    const moduleId = searchParams.get('moduleId') || undefined;
    const scenarioId = searchParams.get('scenarioId') || undefined;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 });

    try {
        const { data: executions, total } = await TestRunModel.findExecutions(runId, sortBy, sortOrder, search, limit, offset, {
            status,
            moduleId,
            scenarioId
        });
        return NextResponse.json(createPaginatedResponse(executions, total, page, limit));
    } catch (error) {
        console.error('Fetch Executions Error:', error);
        return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { runId, testCaseIds = [], moduleIds = [], scenarioIds = [] } = await request.json();
        
        if (!runId || (testCaseIds.length === 0 && moduleIds.length === 0 && scenarioIds.length === 0)) {
            return NextResponse.json({ error: 'Missing runId or data to add' }, { status: 400 });
        }

        // Security Check: Is user assigned to this run?
        const [assignments] = await db.execute<RowDataPacket[]>(`
            SELECT user_id FROM test_run_assignments WHERE run_id = ? AND user_id = ?
        `, [runId, session.user_id]);

        const isAssigned = assignments.length > 0;
        const canBypass = session.permissions.includes('tests:bypass_assignment');

        if (!isAssigned && !canBypass) {
            return NextResponse.json({ error: "You are not assigned to this test run" }, { status: 403 });
        }

        const addedCount = await TestRunModel.addExecutions(runId, testCaseIds, moduleIds, scenarioIds);

        await logActivity(session.user_id, 'UPDATE', 'TEST_RUN', runId, { 
            action: 'ADD_CASES',
            count: addedCount,
            modules: moduleIds.length,
            scenarios: scenarioIds.length
        });

        return NextResponse.json({ success: true, addedCount });
    } catch (error) {
        console.error('Add Executions Error:', error);
        return NextResponse.json({ error: 'Failed to add executions' }, { status: 500 });
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

        // Security Check: Is user assigned to this run?
        const [assignments] = await db.execute<RowDataPacket[]>(`
            SELECT tra.user_id 
            FROM test_run_assignments tra
            JOIN test_executions te ON tra.run_id = te.run_id
            WHERE te.execution_id = ? AND tra.user_id = ?
        `, [execution_id, session.user_id]);

        const isAssigned = assignments.length > 0;
        const canBypass = session.permissions.includes('tests:bypass_assignment');

        if (!isAssigned && !canBypass) {
            return NextResponse.json({ error: "You are not assigned to this test run" }, { status: 403 });
        }
        
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

export async function PATCH(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { ids, status, runId } = await request.json();
        if (!ids || !Array.isArray(ids) || !status) {
            return NextResponse.json({ error: 'Missing ids or status' }, { status: 400 });
        }

        // Security Check: Is user assigned to this run?
        if (runId) {
            const [assignments] = await db.execute<RowDataPacket[]>(`
                SELECT user_id FROM test_run_assignments WHERE run_id = ? AND user_id = ?
            `, [runId, session.user_id]);

            const isAssigned = assignments.length > 0;
            const canBypass = session.permissions.includes('tests:bypass_assignment');

            if (!isAssigned && !canBypass) {
                return NextResponse.json({ error: "You are not assigned to this test run" }, { status: 403 });
            }
        }

        await TestRunModel.bulkUpdateStatus(ids, status);

        if (runId) {
            await logActivity(session.user_id, 'UPDATE', 'TEST_RUN', runId, { 
                action: 'BULK_STATUS_UPDATE',
                count: ids.length,
                status
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Bulk Update Execution Error:', error);
        return NextResponse.json({ error: 'Failed to update executions' }, { status: 500 });
    }
}

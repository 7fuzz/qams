import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestRunModel } from '@/models/TestRun';
import { logActivity } from '@/lib/logger';
import { createPaginatedResponse } from '@/lib/pagination-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const moduleId = searchParams.get('moduleId') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || undefined;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        const { data: runs, total } = await TestRunModel.findAll({
            projectId,
            moduleId,
            search,
            sortBy,
            sortOrder
        }, limit, offset);

        return NextResponse.json(createPaginatedResponse(runs, total, page, limit));    } catch {
        return NextResponse.json({ error: 'Failed to fetch test runs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { project_id, name, type, scenario_ids, module_ids } = await request.json();
        
        const runId = await TestRunModel.create({
            project_id,
            name,
            type,
            tester_id: session.user_id,
            scenario_ids,
            module_ids
        });

        await logActivity(session.user_id, 'CREATE', 'TEST_RUN', runId, { name, project_id });
        
        return NextResponse.json({ run_id: runId, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create test run' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { run_id, status } = await request.json();
        
        await TestRunModel.updateStatus(run_id, status);
        
        await logActivity(session.user_id, 'UPDATE', 'PROJECT', run_id, { action: 'SET_RUN_STATUS', status });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update test run' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await TestRunModel.delete(id);
        await logActivity(session.user_id, 'DELETE', 'TEST_RUN', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete test run' }, { status: 500 });
    }
}

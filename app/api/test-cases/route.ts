import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestCaseModel } from '@/models/TestCase';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        const { data: testCases, total } = await TestCaseModel.findAll({
            scenarioId: scenarioId || undefined,
            projectId: projectId || undefined,
            moduleId: moduleId || undefined
        }, limit, offset);

        return NextResponse.json({
            data: testCases,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const testCaseId = await TestCaseModel.create(body);
        
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', testCaseId, { title: body.title, scenario_id: body.scenario_id });
        
        return NextResponse.json({ test_case_id: testCaseId, ...body });
    } catch {
        return NextResponse.json({ error: 'Failed to create test case' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { test_case_id } = body;
        await TestCaseModel.update(test_case_id, body);
        
        logActivity(session.user_id, 'UPDATE', 'TEST_CASE', test_case_id, { title: body.title });
        
        return NextResponse.json({ success: true, ...body });
    } catch {
        return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await TestCaseModel.delete(id);
        logActivity(session.user_id, 'DELETE', 'TEST_CASE', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete test case' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { test_case_id } = await request.json();
        const result = await TestCaseModel.duplicate(test_case_id);
        
        if (!result) return NextResponse.json({ error: "Source not found" }, { status: 404 });

        logActivity(session.user_id, 'CREATE', 'TEST_CASE', result.id, { title: result.title, original_id: test_case_id });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to duplicate test case' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestCaseModel } from '@/models/TestCase';
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';
import { canManageProject } from '@/lib/auth-utils';

export async function GET(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || undefined;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        const { data: testCases, total } = await TestCaseModel.findAll({
            scenarioId: scenarioId || undefined,
            projectId: projectId || undefined,
            moduleId: moduleId || undefined,
            sortBy,
            sortOrder
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
    if (!session.isLoggedIn || !session.permissions.includes('tests:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromScenario(body.scenario_id);
        if (!projectId) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const testCaseId = await TestCaseModel.create(body);
        const newTestCase = await TestCaseModel.findById(testCaseId);
        
        await logActivity(session.user_id, 'CREATE', 'TEST_CASE', testCaseId, { 
            title: body.title, 
            scenario_id: body.scenario_id,
            custom_id: newTestCase?.custom_id
        });
        
        return NextResponse.json(newTestCase);
    } catch {
        return NextResponse.json({ error: 'Failed to create test case' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { test_case_id } = body;
        
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromTestCase(test_case_id);
        if (!projectId) return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await TestCaseModel.update(test_case_id, body);
        
        await logActivity(session.user_id, 'UPDATE', 'TEST_CASE', test_case_id, { title: body.title });
        
        return NextResponse.json({ success: true, ...body });
    } catch {
        return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    try {
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromTestCase(id);
        if (!projectId) return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await TestCaseModel.delete(id);
        await logActivity(session.user_id, 'DELETE', 'TEST_CASE', id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete test case' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('tests:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { test_case_id } = await request.json();
        
        // Check project access
        const projectId = await ProjectModel.getProjectIdFromTestCase(test_case_id);
        if (!projectId) return NextResponse.json({ error: "Test case not found" }, { status: 404 });
        
        if (!await canManageProject(session, projectId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const result = await TestCaseModel.duplicate(test_case_id);
        
        if (!result) return NextResponse.json({ error: "Source not found" }, { status: 404 });

        await logActivity(session.user_id, 'CREATE', 'TEST_CASE', result.id, { title: result.title, original_id: test_case_id });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to duplicate test case' }, { status: 500 });
    }
}

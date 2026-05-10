import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { IssueModel } from '@/models/Issue';
import { logActivity } from '@/lib/logger';
import { ISSUE_STATUS } from '@/lib/constants';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const issueId = searchParams.get('issueId');
    const issueIdsParam = searchParams.get('issueIds');
    const runId = searchParams.get('runId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');
    const developerId = searchParams.get('developerId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'ASC' | 'DESC' | null;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const issueIds = issueIdsParam ? issueIdsParam.split(',') : undefined;

    try {
        const { data: issues, total } = await IssueModel.findAll({
            testCaseId: testCaseId || undefined,
            issueId: issueId || undefined,
            issueIds,
            runId: runId || undefined,
            projectId: projectId || undefined,
            moduleId: moduleId || undefined,
            developerId: developerId || undefined,
            status: status || undefined,
            search: search || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder || undefined
        }, limit, offset);

        return NextResponse.json({
            data: issues,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }
}

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || !session.permissions.includes('tests:run')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { test_case_id, test_case_ids, title, description, severity, execution_id, developer_id, estimated_date } = body;

    // Support both single and multiple test cases during transition or from different components
    const finalTestCaseIds = test_case_ids || (test_case_id ? [test_case_id] : []);

    const id = await IssueModel.create({
        test_case_ids: finalTestCaseIds,
        title,
        description,
        severity,
        reporter_id: session.user_id,
        execution_id,
        developer_id,
        estimated_date
    });

    if (finalTestCaseIds.length > 0) {
        await logActivity(session.user_id, 'CREATE', 'TEST_CASE', finalTestCaseIds[0], { issue_id: id, title, all_test_cases: finalTestCaseIds });
    }

    return NextResponse.json({ issue_id: id, title, status: ISSUE_STATUS.OPEN });
  } catch (error) {
    console.error('Create Issue Error:', error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || !session.permissions.includes('issues:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { issue_id, status, severity, title, description, execution_id, developer_id, estimated_date, test_case_ids } = await request.json();

    await IssueModel.update(issue_id, {
        status,
        severity,
        title,
        description,
        user_id: session.user_id,
        test_case_ids,
        execution_id,
        developer_id,
        estimated_date
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Issue Error:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('issues:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await IssueModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
    }
}

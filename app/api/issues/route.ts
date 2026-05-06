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
    const runId = searchParams.get('runId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');
    const developerId = searchParams.get('developerId');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'ASC' | 'DESC' | null;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        const { data: issues, total } = await IssueModel.findAll({
            testCaseId: testCaseId || undefined,
            runId: runId || undefined,
            projectId: projectId || undefined,
            moduleId: moduleId || undefined,
            developerId: developerId || undefined,
            status: status || undefined,
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
    const { test_case_id, title, description, severity, execution_id, developer_id, estimated_date } = await request.json();
    
    const id = await IssueModel.create({
        test_case_id,
        title,
        description,
        severity,
        reporter_id: session.user_id,
        execution_id,
        developer_id,
        estimated_date
    });

    await logActivity(session.user_id, 'CREATE', 'TEST_CASE', test_case_id, { issue_id: id, title });
    
    return NextResponse.json({ issue_id: id, title, status: ISSUE_STATUS.OPEN });
  } catch {
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || !session.permissions.includes('issues:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { issue_id, status, severity, title, description, execution_id, developer_id, estimated_date } = await request.json();
    
    await IssueModel.update(issue_id, {
        status,
        severity,
        title,
        description,
        user_id: session.user_id,
        execution_id,
        developer_id,
        estimated_date
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}

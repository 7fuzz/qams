import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { IssueModel } from '@/models/Issue';
import { ProjectModel } from '@/models/Project';
import { logActivity } from '@/lib/logger';
import { ISSUE_STATUS } from '@/lib/constants';
import { canManageProject } from '@/lib/auth-utils';

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
    const { test_case_id, test_case_ids, title, description, severity, execution_id, developer_id, sla_date, actual_date, tag_ids } = body;

    const finalTestCaseIds = test_case_ids || (test_case_id ? [test_case_id] : []);
    
    // Check project access for each test case
    for (const tcId of finalTestCaseIds) {
        const pId = await ProjectModel.getProjectIdFromTestCase(tcId);
        if (pId && !await canManageProject(session, pId)) {
            return NextResponse.json({ error: "Forbidden: You don't have access to one of the associated projects" }, { status: 403 });
        }
    }

    const id = await IssueModel.create({
        test_case_ids: finalTestCaseIds,
        title,
        description,
        severity,
        reporter_id: session.user_id,
        execution_id,
        developer_id,
        sla_date,
        actual_date,
        tag_ids
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
    const { issue_id, status, severity, title, description, execution_id, developer_id, sla_date, actual_date, test_case_ids, tag_ids } = await request.json();

    // Check project access
    const pIds = await IssueModel.getProjectIdsFromIssue(issue_id);
    let allowed = session.permissions.includes('projects:manage_all');
    if (!allowed) {
        for (const pId of pIds) {
            if (await ProjectModel.isUserAssigned(pId, session.user_id)) {
                allowed = true;
                break;
            }
        }
    }
    
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await IssueModel.update(issue_id, {
        status,
        severity,
        title,
        description,
        user_id: session.user_id,
        test_case_ids,
        execution_id,
        developer_id,
        sla_date,
        actual_date,
        tag_ids
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
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        // Check project access
        const pIds = await IssueModel.getProjectIdsFromIssue(id);
        let allowed = session.permissions.includes('projects:manage_all');
        if (!allowed) {
            for (const pId of pIds) {
                if (await ProjectModel.isUserAssigned(pId, session.user_id)) {
                    allowed = true;
                    break;
                }
            }
        }
        
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await IssueModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
    }
}

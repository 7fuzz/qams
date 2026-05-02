import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

interface CountResult {
    total: number;
}

interface TestCaseSource {
    scenario_id: string;
    title: string;
    type: string;
    priority: string;
    automation_status: string;
    requirement_link: string;
    estimated_duration: number;
    precondition: string;
    steps: string;
    test_data: string;
    expected_result: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        let whereClause = 'WHERE 1=1';
        const params: string[] = [];

        if (scenarioId) {
            whereClause += ' AND tc.scenario_id = ?';
            params.push(scenarioId);
        } else if (moduleId) {
            whereClause += ' AND m.module_id = ?';
            params.push(moduleId);
        } else if (projectId) {
            whereClause += ' AND p.project_id = ?';
            params.push(projectId);
        }

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            ${whereClause}
        `;
        const countRes = db.prepare(countQuery).get(...params) as CountResult | undefined;
        const total = countRes ? countRes.total : 0;

        const dataQuery = `
            SELECT 
                tc.*, 
                s.name as scenario_name, 
                m.name as module_name, 
                p.name as project_name,
                p.project_id,
                m.module_id,
                u.name as owner_name,
                (SELECT COUNT(*) FROM issues i WHERE i.test_case_id = tc.test_case_id AND i.status != 'Closed') as open_issues_count,
                (SELECT COUNT(*) FROM issues i WHERE i.test_case_id = tc.test_case_id AND i.status = 'Closed') as closed_issues_count
            FROM test_cases tc
            JOIN scenarios s ON tc.scenario_id = s.scenario_id
            JOIN modules m ON s.module_id = m.module_id
            JOIN projects p ON m.project_id = p.project_id
            JOIN users u ON p.owner_id = u.user_id
            ${whereClause}
            ORDER BY tc.test_case_id DESC
            LIMIT ? OFFSET ?
        `;
        
        const testCases = db.prepare(dataQuery).all(...params, limit, offset);

        return NextResponse.json({
            data: testCases,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('SQL Error Detail:', error);
        return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result } = body;
        const testCaseId = generateId();
        
        db.prepare(`
            INSERT INTO test_cases (test_case_id, scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(testCaseId, scenario_id, title, type, priority || null, automation_status || null, requirement_link || null, estimated_duration || null, precondition, steps, test_data, expected_result);
        
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', testCaseId, { title, scenario_id });
        
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
        const { test_case_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result, scenario_id } = body;
        
        db.prepare(`
            UPDATE test_cases 
            SET title = ?, type = ?, priority = ?, automation_status = ?, requirement_link = ?, estimated_duration = ?, precondition = ?, steps = ?, test_data = ?, expected_result = ?, scenario_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE test_case_id = ?
        `).run(title, type, priority || null, automation_status || null, requirement_link || null, estimated_duration || null, precondition, steps, test_data, expected_result, scenario_id, test_case_id);
        
        logActivity(session.user_id, 'UPDATE', 'TEST_CASE', test_case_id, { title });
        
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
        db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(id);
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
        
        const source = db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(test_case_id) as TestCaseSource | undefined;
        if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

        const newId = generateId();
        db.prepare(`
            INSERT INTO test_cases (test_case_id, scenario_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newId,
            source.scenario_id, 
            source.title + ' (Copy)', 
            source.type, 
            source.priority,
            source.automation_status,
            source.requirement_link,
            source.estimated_duration,
            source.precondition, 
            source.steps, 
            source.test_data, 
            source.expected_result
        );

        logActivity(session.user_id, 'CREATE', 'TEST_CASE', newId, { title: source.title + ' (Copy)', original_id: test_case_id });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to duplicate test case' }, { status: 500 });
    }
}

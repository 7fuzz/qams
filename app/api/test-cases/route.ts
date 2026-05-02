import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const projectId = searchParams.get('projectId');
    const moduleId = searchParams.get('moduleId');

    try {
        let query = `
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
            WHERE 1=1
        `;
        const params: string[] = [];

        if (scenarioId) {
            query += ' AND tc.scenario_id = ?';
            params.push(scenarioId);
        } else if (moduleId) {
            query += ' AND m.module_id = ?';
            params.push(moduleId);
        } else if (projectId) {
            query += ' AND p.project_id = ?';
            params.push(projectId);
        }

        const testCases = db.prepare(query).all(...params);
        return NextResponse.json(testCases);
    } catch (error) {
        console.error(error);
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
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create test case' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { test_case_id, title, type, priority, automation_status, requirement_link, estimated_duration, precondition, steps, test_data, expected_result } = body;
        
        db.prepare(`
            UPDATE test_cases 
            SET title = ?, type = ?, priority = ?, automation_status = ?, requirement_link = ?, estimated_duration = ?, precondition = ?, steps = ?, test_data = ?, expected_result = ?
            WHERE test_case_id = ?
        `).run(title, type, priority || null, automation_status || null, requirement_link || null, estimated_duration || null, precondition, steps, test_data, expected_result, test_case_id);
        
        logActivity(session.user_id, 'UPDATE', 'TEST_CASE', test_case_id, { title });
        
        return NextResponse.json({ success: true, ...body });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'TEST_CASE', id!);
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
        
        const source = db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(test_case_id) as any;
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
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to duplicate test case' }, { status: 500 });
    }
}

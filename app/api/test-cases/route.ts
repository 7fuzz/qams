import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');

    try {
        let query = 'SELECT * FROM test_cases';
        const params: string[] = [];

        if (scenarioId) {
            query += ' WHERE scenario_id = ?';
            params.push(scenarioId);
        }

        const testCases = db.prepare(query).all(...params);
        return NextResponse.json(testCases);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { scenario_id, title, type, precondition, steps, test_data, expected_result } = body;
        
        const info = db.prepare(`
            INSERT INTO test_cases (scenario_id, title, type, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(scenario_id, title, type, precondition, steps, test_data, expected_result);
        
        const testCaseId = info.lastInsertRowid;
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', testCaseId as number, { title, scenario_id });
        
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
        const { test_case_id, title, type, precondition, steps, test_data, expected_result } = body;
        
        db.prepare(`
            UPDATE test_cases 
            SET title = ?, type = ?, precondition = ?, steps = ?, test_data = ?, expected_result = ?
            WHERE test_case_id = ?
        `).run(title, type, precondition, steps, test_data, expected_result, test_case_id);
        
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
        db.prepare('DELETE FROM test_cases WHERE test_case_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'TEST_CASE', Number(id));
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
        
        const source = db.prepare('SELECT * FROM test_cases WHERE test_case_id = ?').get(test_case_id);
        if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

        const info = db.prepare(`
            INSERT INTO test_cases (scenario_id, title, type, precondition, steps, test_data, expected_result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            source.scenario_id, 
            source.title + ' (Copy)', 
            source.type, 
            source.precondition, 
            source.steps, 
            source.test_data, 
            source.expected_result
        );

        logActivity(session.user_id, 'CREATE', 'TEST_CASE', info.lastInsertRowid as number, { title: source.title + ' (Copy)', original_id: test_case_id });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to duplicate test case' }, { status: 500 });
    }
}

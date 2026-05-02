import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    try {
        let query = 'SELECT * FROM scenarios';
        const params: string[] = [];

        if (moduleId) {
            query += ' WHERE module_id = ?';
            params.push(moduleId);
        }

        const scenarios = db.prepare(query).all(...params);
        return NextResponse.json(scenarios);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { module_id, name } = await request.json();
        const scenarioId = generateId();
        db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)')
            .run(scenarioId, module_id, name);
        
        logActivity(session.user_id, 'CREATE', 'SCENARIO', scenarioId, { name, module_id });
        
        return NextResponse.json({ scenario_id: scenarioId, module_id, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { scenario_id, name } = await request.json();
        db.prepare('UPDATE scenarios SET name = ? WHERE scenario_id = ?').run(name, scenario_id);
        logActivity(session.user_id, 'UPDATE', 'SCENARIO', scenario_id, { name });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        db.prepare('DELETE FROM scenarios WHERE scenario_id = ?').run(id);
        logActivity(session.user_id, 'DELETE', 'SCENARIO', id!);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';
import { TEST_CASE_TYPE, TEST_PRIORITY, AUTOMATION_STATUS } from '@/lib/constants';

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { moduleId, testCases } = await request.json();
        
        if (!testCases || !Array.isArray(testCases)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const importTransaction = db.transaction((cases) => {
            const scenarioCache: Record<string, string> = {};

            const insertCase = db.prepare(`
                INSERT INTO test_cases (
                    test_case_id, scenario_id, title, type, priority, 
                    automation_status, requirement_link, estimated_duration, 
                    precondition, steps, test_data, expected_result
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const findScenario = db.prepare('SELECT scenario_id FROM scenarios WHERE name = ? AND module_id = ?');
            const createScenario = db.prepare('INSERT INTO scenarios (scenario_id, module_id, name) VALUES (?, ?, ?)');

            for (const tc of cases) {
                const scenarioName = tc.scenario || 'Default Scenario';
                
                // 1. Get or Create Scenario ID
                let scenarioId = scenarioCache[scenarioName];
                if (!scenarioId) {
                    const existing = findScenario.get(scenarioName, moduleId) as { scenario_id: string };
                    if (existing) {
                        scenarioId = existing.scenario_id;
                    } else {
                        scenarioId = generateId();
                        createScenario.run(scenarioId, moduleId, scenarioName);
                    }
                    scenarioCache[scenarioName] = scenarioId;
                }

                // 2. Insert Test Case
                insertCase.run(
                    generateId(),
                    scenarioId,
                    tc.title || tc.case || 'Untitled Case', // Support both 'title' or 'case' headers
                    tc.type || TEST_CASE_TYPE.POSITIVE,
                    tc.priority || TEST_PRIORITY.P2,
                    tc.automation_status || AUTOMATION_STATUS.MANUAL,
                    tc.requirement_link || null,
                    parseInt(tc.estimated_duration) || 0,
                    tc.precondition || '',
                    tc.steps || '',
                    tc.test_data || '',
                    tc.expected_result || ''
                );
            }
        });

        importTransaction(testCases);
        
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', moduleId, { action: 'IMPORT_BATCH', count: testCases.length });
        
        return NextResponse.json({ success: true, count: testCases.length });
    } catch (error) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: 'Failed to import test cases' }, { status: 500 });
    }
}

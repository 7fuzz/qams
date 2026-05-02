import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { logActivity } from '@/lib/logger';
import { generateId } from '@/lib/id-utils';
import { TEST_CASE_TYPE, TEST_PRIORITY, AUTOMATION_STATUS } from '@/lib/constants';

function normalizeType(val: string): string | null {
    const s = String(val || '').toLowerCase().trim();
    if (s.includes('pos')) return TEST_CASE_TYPE.POSITIVE;
    if (s.includes('neg')) return TEST_CASE_TYPE.NEGATIVE;
    if (s.includes('edge')) return TEST_CASE_TYPE.EDGE_CASE;
    return null;
}

function normalizePriority(val: string): string | null {
    const s = String(val || '').toLowerCase().trim();
    if (s === 'p0' || s.includes('crit')) return TEST_PRIORITY.P0;
    if (s === 'p1' || s === 'h' || s.includes('high')) return TEST_PRIORITY.P1;
    if (s === 'p2' || s === 'm' || s.includes('med')) return TEST_PRIORITY.P2;
    if (s === 'p3' || s === 'l' || s.includes('low')) return TEST_PRIORITY.P3;
    return null;
}

function normalizeAutomation(val: string): string {
    const s = String(val || '').toLowerCase().trim();
    if (s.includes('auto')) return AUTOMATION_STATUS.AUTOMATED;
    if (s.includes('cand') || s.includes('can')) return AUTOMATION_STATUS.CANDIDATE;
    if (s === 'na' || s === 'n/a') return AUTOMATION_STATUS.NOT_APPLICABLE;
    return AUTOMATION_STATUS.MANUAL;
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { moduleId, testCases } = await request.json();
        
        if (!testCases || !Array.isArray(testCases)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let importedCount = 0;
        let skippedCount = 0;

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
                // 1. Normalize and Validate Required Enums
                const type = normalizeType(tc.type);
                const priority = normalizePriority(tc.priority);

                if (!type || !priority) {
                    skippedCount++;
                    continue; // Discard invalid row
                }

                const scenarioName = tc.scenario || 'Default Scenario';
                
                // 2. Get or Create Scenario ID
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

                // 3. Insert Test Case
                insertCase.run(
                    generateId(),
                    scenarioId,
                    tc.title || tc.case || 'Untitled Case',
                    type,
                    priority,
                    normalizeAutomation(tc.automation_status),
                    tc.requirement_link || null,
                    parseInt(tc.estimated_duration) || 0,
                    tc.precondition || '',
                    tc.steps || '',
                    tc.test_data || '',
                    tc.expected_result || ''
                );
                importedCount++;
            }
        });

        importTransaction(testCases);
        
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', moduleId, { action: 'IMPORT_BATCH', count: importedCount, skipped: skippedCount });
        
        return NextResponse.json({ success: true, count: importedCount, skipped: skippedCount });
    } catch (error) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: 'Failed to import test cases' }, { status: 500 });
    }
}

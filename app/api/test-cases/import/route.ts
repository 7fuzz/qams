import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { TestCaseModel } from '@/models/TestCase';
import { logActivity } from '@/lib/logger';
import { TEST_CASE_TYPE, TEST_PRIORITY, AUTOMATION_STATUS } from '@/lib/constants';

function normalizeType(val: any): string | null {
    const s = String(val || '').toLowerCase().trim();
    if (s.includes('pos')) return TEST_CASE_TYPE.POSITIVE;
    if (s.includes('neg')) return TEST_CASE_TYPE.NEGATIVE;
    if (s.includes('edge')) return TEST_CASE_TYPE.EDGE_CASE;
    return null;
}

function normalizePriority(val: any): string | null {
    const s = String(val || '').toLowerCase().trim();
    if (s === 'p0' || s.includes('crit')) return TEST_PRIORITY.P0;
    if (s === 'p1' || s === 'h' || s.includes('high')) return TEST_PRIORITY.P1;
    if (s === 'p2' || s === 'm' || s.includes('med')) return TEST_PRIORITY.P2;
    if (s === 'p3' || s === 'l' || s.includes('low')) return TEST_PRIORITY.P3;
    return null;
}

function normalizeAutomation(val: any): string {
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

        const { importedCount, skippedCount } = TestCaseModel.importTestCases(moduleId, testCases, {
            type: normalizeType,
            priority: normalizePriority,
            automation: normalizeAutomation
        });
        
        logActivity(session.user_id, 'CREATE', 'TEST_CASE', moduleId, { action: 'IMPORT_BATCH', count: importedCount, skipped: skippedCount });
        
        return NextResponse.json({ success: true, count: importedCount, skipped: skippedCount });
    } catch (error) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: 'Failed to import test cases' }, { status: 500 });
    }
}

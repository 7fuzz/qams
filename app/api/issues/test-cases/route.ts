import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { IssueModel } from '@/models/Issue';
import { logActivity } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        const testCases = await IssueModel.getTestCases(id);
        return NextResponse.json(testCases);
    } catch (error) {
        console.error('Fetch Issue Test Cases Error:', error);
        return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('issues:write')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { issueId, testCaseIds } = await request.json();
        if (!issueId || !testCaseIds || !Array.isArray(testCaseIds)) {
            return NextResponse.json({ error: 'Missing issueId or testCaseIds' }, { status: 400 });
        }

        const { linkedCount, skippedCount } = await IssueModel.linkToTestCases(issueId, testCaseIds);

        await logActivity(session.user_id, 'UPDATE', 'ISSUE', issueId, { 
            action: 'LINK_TEST_CASES',
            linked: linkedCount,
            skipped: skippedCount
        });

        return NextResponse.json({ success: true, linkedCount, skippedCount });
    } catch (error) {
        console.error('Bulk Link Issue Error:', error);
        return NextResponse.json({ error: 'Failed to link test cases' }, { status: 500 });
    }
}

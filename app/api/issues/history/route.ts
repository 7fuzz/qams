import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('issueId');

    try {
        const [history] = await db.execute(`
            SELECT h.*, u.name as user_name, r.name as run_name
            FROM issue_history h
            JOIN users u ON h.user_id = u.user_id
            LEFT JOIN test_runs r ON h.run_id = r.run_id
            WHERE h.issue_id = ?
            ORDER BY h.timestamp DESC
        `, [issueId]);
        return NextResponse.json(history);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}

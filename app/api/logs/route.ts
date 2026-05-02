import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const logs = db.prepare(`
            SELECT l.*, u.name as user_name 
            FROM activity_log l 
            JOIN users u ON l.user_id = u.user_id 
            ORDER BY timestamp DESC 
            LIMIT 50
        `).all();
        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

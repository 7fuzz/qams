import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('logs:read')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [logs] = await db.execute(`
            SELECT l.*, u.name as user_name 
            FROM activity_log l 
            JOIN users u ON l.user_id = u.user_id 
            ORDER BY timestamp DESC 
            LIMIT 50
        `);
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

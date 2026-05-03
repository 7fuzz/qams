import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const stats = {
            total_projects: (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count,
            total_users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count,
            recent_activity_count: (db.prepare("SELECT COUNT(*) as count FROM activity_log WHERE timestamp >= datetime('now', '-24 hours')").get() as { count: number }).count,
        };
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

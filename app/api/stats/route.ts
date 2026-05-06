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
        const [[{ count: total_projects }]] = await db.execute('SELECT COUNT(*) as count FROM projects') as any;
        const [[{ count: total_users }]] = await db.execute('SELECT COUNT(*) as count FROM users') as any;
        const [[{ count: recent_activity_count }]] = await db.execute("SELECT COUNT(*) as count FROM activity_log WHERE timestamp >= NOW() - INTERVAL 24 HOUR") as any;

        const stats = {
            total_projects,
            total_users,
            recent_activity_count,
        };
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

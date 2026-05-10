import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';

import { RowDataPacket } from 'mysql2';

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [projectsRows] = await db.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM projects');
        const [usersRows] = await db.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
        const [activityRows] = await db.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM activity_log WHERE timestamp >= NOW() - INTERVAL 24 HOUR");

        const stats = {
            total_projects: projectsRows[0].count,
            total_users: usersRows[0].count,
            recent_activity_count: activityRows[0].count,
        };
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

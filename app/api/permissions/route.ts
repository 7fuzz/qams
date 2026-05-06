import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { RoleModel } from '@/models/Role';

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('roles:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const permissions = await RoleModel.findAllPermissions();
        return NextResponse.json(permissions);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
    }
}

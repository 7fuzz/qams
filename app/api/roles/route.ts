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
        const roles = await RoleModel.findAll();
        const rolesWithPermissions = await Promise.all(roles.map(async (role: any) => ({
            ...role,
            permissions: await RoleModel.getPermissions(role.role_id)
        })));
        return NextResponse.json(rolesWithPermissions);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('roles:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, permissionIds } = await request.json();
        const roleId = await RoleModel.create(name, permissionIds);
        return NextResponse.json({ role_id: roleId, name });
    } catch {
        return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('roles:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { role_id, name, permissionIds } = await request.json();
        await RoleModel.update(role_id, name, permissionIds);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || !session.permissions.includes('roles:manage')) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        await RoleModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
}

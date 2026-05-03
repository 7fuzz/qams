import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { UserModel } from '@/models/User';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        const { data: users, total } = await UserModel.findAll(limit, offset);

        return NextResponse.json({
            data: users,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || session.role !== 'Admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name, email, password, role_id } = await request.json();
        const userId = await UserModel.create({ name, email, password, role_id });
        
        return NextResponse.json({ user_id: userId, name, email });
    } catch (error: unknown) {
        const err = error as { code?: string };
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || session.role !== 'Admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { user_id, name, email, password, role_id } = await request.json();
        await UserModel.update(user_id, { name, email, password, role_id });
        
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn || session.role !== 'Admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    try {
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        if (id === session.user_id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        UserModel.delete(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

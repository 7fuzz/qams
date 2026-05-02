import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';
import { hashPassword } from '@/lib/auth-utils';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
        const baseQuery = 'FROM users u JOIN roles r ON u.role_id = r.role_id';
        
        // 1. Total
        const countRes = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get() as { total: number };
        
        // 2. Data
        const users = db.prepare(`
            SELECT u.user_id, u.name, u.email, r.name as role_name, u.role_id 
            ${baseQuery}
            ORDER BY u.name ASC
            LIMIT ? OFFSET ?
        `).all(limit, offset);

        return NextResponse.json({
            data: users,
            total: countRes.total,
            totalPages: Math.ceil(countRes.total / limit)
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
        const userId = generateId();
        const hashed = await hashPassword(password || '123456');

        db.prepare('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)')
            .run(userId, name, email, hashed, role_id);
        
        return NextResponse.json({ user_id: userId, name, email });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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
        
        if (password) {
            const hashed = await hashPassword(password);
            db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role_id = ? WHERE user_id = ?')
                .run(name, email, hashed, role_id, user_id);
        } else {
            db.prepare('UPDATE users SET name = ?, email = ?, role_id = ? WHERE user_id = ?')
                .run(name, email, role_id, user_id);
        }
        
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
        if (id === session.user_id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        db.prepare('DELETE FROM users WHERE user_id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

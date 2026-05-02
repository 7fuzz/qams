import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const users = db.prepare(`
            SELECT u.user_id, u.name, u.email, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id
            ORDER BY u.name ASC
        `).all();
        return NextResponse.json(users);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

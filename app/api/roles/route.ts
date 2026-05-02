import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const roles = db.prepare('SELECT role_id, name FROM roles ORDER BY name ASC').all();
        return NextResponse.json(roles);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}

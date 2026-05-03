import { NextResponse } from 'next/server';
import { RoleModel } from '@/models/Role';

export async function GET() {
    try {
        const roles = RoleModel.findAll();
        return NextResponse.json(roles);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}

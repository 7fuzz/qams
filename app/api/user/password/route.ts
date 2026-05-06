import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { UserModel } from '@/models/User';
import { comparePassword } from '@/lib/auth-utils';

export async function PUT(request: Request) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { currentPassword, newPassword } = await request.json();
        
        // Re-fetch with full data including password
        const fullUser = await UserModel.findByEmail(session.email);
        if (!fullUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // If user has a password set, verify it first
        if (fullUser.password) {
            const isMatch = await comparePassword(currentPassword, fullUser.password);
            if (!isMatch) {
                return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
            }
        } else {
            // User was Google-only and is now setting a password
            // No currentPassword check needed if it's the first time, 
            // but for security we usually require it.
            // In this case, if password was NULL, we allow setting it.
        }

        await UserModel.updatePassword(session.user_id, newPassword);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password Change Error:', error);
        return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
    }
}

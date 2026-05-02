import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";
import db from "@/lib/db";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn || session.role !== 'Admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = db.prepare(`
      SELECT u.user_id, u.name, u.email, r.name as role 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id
    `).all();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

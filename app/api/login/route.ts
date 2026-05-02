import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";
import db from "@/lib/db";
import { comparePassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { email, password } = await request.json();

  try {
    const user = db.prepare(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE u.email = ?
    `).get(email);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    session.user_id = user.user_id;
    session.name = user.name;
    session.email = user.email;
    session.role = user.role_name;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

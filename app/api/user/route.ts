import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData, defaultSession } from "@/lib/session";
import db from "@/lib/db";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json(defaultSession);
  }

  // Safety check: Verify user still exists in DB (e.g. after a rebuild/re-seed)
  try {
    const userExists = db.prepare('SELECT 1 FROM users WHERE user_id = ?').get(session.user_id);
    if (!userExists) {
        session.destroy();
        return NextResponse.json(defaultSession);
    }
  } catch {
    session.destroy();
    return NextResponse.json(defaultSession);
  }

  return NextResponse.json(session);
}

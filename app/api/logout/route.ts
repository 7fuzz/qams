import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";
import { logActivity } from "@/lib/logger";

export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (session.user_id) {
    await logActivity(session.user_id, 'LOGOUT', 'AUTH', session.user_id);
  }
  session.destroy();
  return NextResponse.json({ ok: true });
}

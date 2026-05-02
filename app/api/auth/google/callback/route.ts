import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { sessionOptions, SessionData } from "@/lib/session";
import db from "@/lib/db";
import { generateId } from "@/lib/id-utils";

interface DbUser {
    user_id: string;
    name: string;
    email: string;
    role_name: string;
    role_id: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=no_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Failed to get user info");
    }

    const { email, name, sub: googleId } = payload;

    // 1. Check if user exists by email
    let user = db.prepare(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE u.email = ?
    `).get(email) as DbUser | undefined;

    if (!user) {
      // 2. Create user if doesn't exist
      // Assign default 'QA' role
      const qaRole = db.prepare('SELECT role_id FROM roles WHERE name = ?').get('QA') as { role_id: string };
      const userId = generateId();
      db.prepare(`
        INSERT INTO users (user_id, name, email, password, role_id) 
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, name || email, email, `google_${googleId}`, qaRole.role_id);
      
      user = db.prepare(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        WHERE u.user_id = ?
      `).get(userId) as DbUser;
    }

    // 3. Set Session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.user_id = user.user_id;
    session.name = user.name;
    session.email = user.email;
    session.role = user.role_name;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`);
  } catch (error) {
    console.error("Google Auth Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=auth_failed`);
  }
}

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { sessionOptions, SessionData } from "@/lib/session";
import { UserModel } from "@/models/User";
import { RoleModel } from "@/models/Role";

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
    let user = UserModel.findByEmail(email);

    if (!user) {
      // 2. Create user if doesn't exist
      // Assign default 'QA' role
      const qaRole = RoleModel.findByName('QA');
      if (!qaRole) throw new Error("Default QA role not found");

      const userId = UserModel.createGoogleUser({
        name: name || email,
        email: email,
        googleId: googleId!,
        roleId: qaRole.role_id
      });
      
      user = UserModel.findById(userId) as any; // Cast to LoginUser compatible
    }

    if (!user) throw new Error("Failed to retrieve user after creation");

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

import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;

  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
  });

  return NextResponse.redirect(url);
}

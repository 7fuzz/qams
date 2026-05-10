import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";
import { comparePassword } from "@/lib/crypto-utils";
import { UserModel } from "@/models/User";
import { RoleModel } from "@/models/Role";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { email, password } = await request.json();

  try {
    const user = await UserModel.findByEmail(email);

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const permissions = await RoleModel.getPermissions(user.role_id);

    session.user_id = user.user_id;
    session.name = user.name;
    session.email = user.email;
    session.role = user.role_name;
    session.permissions = permissions.map(p => p.name);
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

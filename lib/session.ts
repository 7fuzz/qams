import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData } from "@/types/auth";

export type { SessionData };

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session;
}

export const defaultSession: SessionData = {
  user_id: "",
  name: "",
  email: "",
  role: "",
  permissions: [],
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "test-management-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

import { SessionOptions } from "iron-session";
import { SessionData } from "@/types/auth";

export type { SessionData };

export const defaultSession: SessionData = {
  user_id: "",
  name: "",
  email: "",
  role: "",
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "test-management-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

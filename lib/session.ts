import { SessionOptions } from "iron-session";

export interface SessionData {
  user_id: string;
  name: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}

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

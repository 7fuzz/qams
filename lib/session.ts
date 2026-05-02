import { IronSessionOptions } from "iron-session";

export interface SessionData {
  user_id: number;
  name: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  user_id: 0,
  name: "",
  email: "",
  role: "",
  isLoggedIn: false,
};

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "test-management-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

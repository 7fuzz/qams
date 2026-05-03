export interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}

export interface LoginUser {
    user_id: string;
    name: string;
    email: string;
    password: string;
    role_name: string;
}

export interface SessionData {
  user_id: string;
  name: string;
  email: string;
  role: string;
  isLoggedIn: boolean;
}

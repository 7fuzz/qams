export interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isLoggedIn: boolean;
}

export interface LoginUser {
    user_id: string;
    name: string;
    email: string;
    password: string;
    role_name: string;
    role_id: string;
}

export interface SessionData {
  user_id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isLoggedIn: boolean;
}

export type UserRole = "ADMIN" | "OPERATOR";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface CurrentUser extends AuthUser {
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: "Bearer";
  user: AuthUser;
}

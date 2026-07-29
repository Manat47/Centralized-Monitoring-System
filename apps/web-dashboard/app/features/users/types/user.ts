export type UserRole = "ADMIN" | "OPERATOR";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface ListUsersQuery {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

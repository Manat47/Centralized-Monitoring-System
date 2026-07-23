import type { User, UserRole, UserStatus } from '../entities/user.entity';

export interface FindUsersFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FindUsersResult {
  items: User[];
  total: number;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(user: User): Promise<User>;

  findById(userId: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findAll(filters?: FindUsersFilters): Promise<FindUsersResult>;

  update(user: User): Promise<User>;
}

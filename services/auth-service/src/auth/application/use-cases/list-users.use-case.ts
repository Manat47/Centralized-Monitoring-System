import { Inject, Injectable } from '@nestjs/common';

import type { UserRole, UserStatus } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface ListUsersInput {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserListItem {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersOutput {
  items: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const result = await this.userRepository.findAll({
      role: input.role,
      status: input.status,
      search: input.search,
      page,
      limit,
    });

    return {
      items: result.items.map((user) => {
        const data = user.toObject();

        return {
          userId: data.userId,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          status: data.status,
          lastLoginAt: data.lastLoginAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }),
      total: result.total,
      page,
      limit,
    };
  }
}

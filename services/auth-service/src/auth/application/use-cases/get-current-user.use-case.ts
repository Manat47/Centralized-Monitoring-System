import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface GetCurrentUserOutput {
  userId: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OPERATOR';
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<GetCurrentUserOutput> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data = user.toObject();

    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
    };
  }
}

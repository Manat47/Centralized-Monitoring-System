import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { UserRole, UserStatus } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface GetUserByIdOutput {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  invitationStatus: 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | null;
  invitationExpiresAt: Date | null;
  invitationSentAt: Date | null;
}

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<GetUserByIdOutput> {
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
      updatedAt: data.updatedAt,
      invitationStatus: user.invitationStatus(),
      invitationExpiresAt: data.invitationExpiresAt,
      invitationSentAt: data.invitationSentAt,
    };
  }
}

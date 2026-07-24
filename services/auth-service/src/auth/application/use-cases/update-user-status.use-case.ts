import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UserStatus } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface UpdateUserStatusInput {
  userId: string;
  status: UserStatus;
  currentUserId: string;
}

export interface UpdateUserStatusOutput {
  userId: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OPERATOR';
  status: UserStatus;
  updatedAt: Date;
}

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateUserStatusInput): Promise<UpdateUserStatusOutput> {
    if (input.userId === input.currentUserId && input.status === 'INACTIVE') {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.status === 'ACTIVE') {
      user.activate();
    } else {
      user.deactivate();
    }

    const updatedUser = await this.userRepository.update(user);

    const data = updatedUser.toObject();

    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      updatedAt: data.updatedAt,
    };
  }
}

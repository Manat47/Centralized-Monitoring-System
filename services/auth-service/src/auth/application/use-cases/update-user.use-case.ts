import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UserRole } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface UpdateUserInput {
  userId: string;
  displayName?: string;
  role?: UserRole;
}

export interface UpdateUserOutput {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: Date;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    if (input.displayName === undefined && input.role === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.displayName !== undefined) {
      user.changeDisplayName(input.displayName);
    }

    if (input.role !== undefined) {
      user.changeRole(input.role);
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

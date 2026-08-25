import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import { hashInvitationToken } from '../invitation-token';

export interface ValidateInvitationOutput {
  email: string;
  displayName: string;
  expiresAt: Date;
}

@Injectable()
export class ValidateInvitationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(token: string): Promise<ValidateInvitationOutput> {
    const user = await this.userRepository.findByInvitationTokenHash(
      hashInvitationToken(token),
    );

    if (!user || !user.canAcceptInvitation()) {
      throw new BadRequestException('Invitation is invalid or expired');
    }

    const data = user.toObject();

    return {
      email: data.email,
      displayName: data.displayName,
      expiresAt: data.invitationExpiresAt!,
    };
  }
}

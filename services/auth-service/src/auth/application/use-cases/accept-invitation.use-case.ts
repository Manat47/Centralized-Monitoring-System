import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import { hashInvitationToken } from '../invitation-token';

export interface AcceptInvitationInput {
  token: string;
  password: string;
}

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<{ email: string }> {
    const tokenHash = hashInvitationToken(input.token);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const updatedUser = await this.userRepository.acceptInvitation(
      tokenHash,
      passwordHash,
      new Date(),
    );

    if (!updatedUser) {
      throw new BadRequestException('Invitation is invalid or expired');
    }
    const data = updatedUser.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: data.userId,
      actorRole: data.role,
      actorEmail: data.email,
      action: 'USER_INVITATION_ACCEPTED',
      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,
      result: 'SUCCESS',
      metadata: { status: data.status },
      occurredAt: new Date(),
    });

    return { email: data.email };
  }
}

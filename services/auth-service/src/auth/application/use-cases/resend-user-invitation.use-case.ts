import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import type { UserRole } from '../../domain/entities/user.entity';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  INVITATION_EVENT_PUBLISHER,
  type InvitationEventPublisher,
} from '../../domain/ports/invitation-event-publisher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  buildInvitationUrl,
  createInvitationExpiration,
  generateInvitationToken,
  hashInvitationToken,
} from '../invitation-token';

export interface ResendUserInvitationInput {
  userId: string;
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class ResendUserInvitationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(INVITATION_EVENT_PUBLISHER)
    private readonly invitationEventPublisher: InvitationEventPublisher,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: ResendUserInvitationInput) {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const before = user.toObject();

    if (before.passwordHash) {
      throw new BadRequestException('Only unaccepted users can be invited');
    }

    const token = generateInvitationToken();
    const expiresAt = createInvitationExpiration(this.configService);

    user.resendInvitation(hashInvitationToken(token), expiresAt);
    const updatedUser = await this.userRepository.update(user);
    const data = updatedUser.toObject();

    await this.invitationEventPublisher.publish({
      invitationId: randomUUID(),
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      invitationUrl: buildInvitationUrl(this.configService, token),
      expiresAt: expiresAt.toISOString(),
    });

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'USER_INVITATION_RESENT',
      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,
      result: 'SUCCESS',
      metadata: { invitationExpiresAt: expiresAt.toISOString() },
      occurredAt: new Date(),
    });

    return {
      userId: data.userId,
      status: data.status,
      invitationStatus: updatedUser.invitationStatus(),
      invitationExpiresAt: data.invitationExpiresAt,
    };
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UserRole } from '../../domain/entities/user.entity';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface RevokeUserInvitationInput {
  userId: string;
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class RevokeUserInvitationUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: RevokeUserInvitationInput) {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.toObject().passwordHash) {
      throw new BadRequestException(
        'This user has already accepted the invitation',
      );
    }

    user.revokeInvitation();
    const updatedUser = await this.userRepository.update(user);
    const data = updatedUser.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'USER_INVITATION_REVOKED',
      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,
      result: 'SUCCESS',
      metadata: { status: data.status },
      occurredAt: new Date(),
    });

    return {
      userId: data.userId,
      status: data.status,
      invitationStatus: updatedUser.invitationStatus(),
    };
  }
}

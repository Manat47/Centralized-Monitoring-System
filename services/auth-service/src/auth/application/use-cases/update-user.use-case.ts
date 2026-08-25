import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UserRole, UserStatus } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  REFRESH_SESSION_REPOSITORY,
  type RefreshSessionRepository,
} from '../../domain/repositories/refresh-session.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
export interface UpdateUserInput {
  userId: string;
  displayName?: string;
  role?: UserRole;

  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

export interface UpdateUserOutput {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  updatedAt: Date;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly refreshSessionRepository: RefreshSessionRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    if (input.displayName === undefined && input.role === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const before = user.toObject();

    if (
      input.userId === input.actorUserId &&
      input.role !== undefined &&
      input.role !== before.role
    ) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (input.displayName !== undefined) {
      user.changeDisplayName(input.displayName);
    }

    if (input.role !== undefined) {
      user.changeRole(input.role);
    }

    const updatedUser = await this.userRepository.update(user);

    const data = updatedUser.toObject();
    const roleChanged = before.role !== data.role;

    if (roleChanged) {
      await this.refreshSessionRepository.revokeAllByUserId(
        data.userId,
        new Date(),
      );
    }

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'USER_UPDATED',
      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,
      result: 'SUCCESS',
      metadata: {
        before: {
          displayName: before.displayName,
          role: before.role,
        },
        after: {
          displayName: data.displayName,
          role: data.role,
        },
        refreshSessionsRevoked: roleChanged,
      },
      occurredAt: new Date(),
    });

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

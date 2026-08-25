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
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface UpdateUserStatusInput {
  userId: string;
  status: UserStatus;
  currentUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
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
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: UpdateUserStatusInput): Promise<UpdateUserStatusOutput> {
    if (input.userId === input.currentUserId && input.status === 'INACTIVE') {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousStatus = user.toObject().status;

    if (input.status === 'ACTIVE') {
      user.activate();
    } else {
      user.deactivate();
    }

    const updatedUser = await this.userRepository.update(user);

    const data = updatedUser.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.currentUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'USER_STATUS_CHANGED',
      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,
      result: 'SUCCESS',
      metadata: {
        previousStatus,
        status: data.status,
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

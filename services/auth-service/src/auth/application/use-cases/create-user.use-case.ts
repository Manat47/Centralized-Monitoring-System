import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { User, type UserRole } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  INVITATION_EVENT_PUBLISHER,
  type InvitationEventPublisher,
} from '../../domain/ports/invitation-event-publisher.port';
import {
  buildInvitationUrl,
  createInvitationExpiration,
  generateInvitationToken,
  hashInvitationToken,
} from '../invitation-token';

export interface CreateUserInput {
  email: string;
  displayName: string;
  role: UserRole;

  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

export interface CreateUserOutput {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'INVITED';
  invitationStatus: 'PENDING';
  invitationExpiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    @Inject(INVITATION_EVENT_PUBLISHER)
    private readonly invitationEventPublisher: InvitationEventPublisher,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = createInvitationExpiration(this.configService);

    const user = User.createInvited(randomUUID(), {
      email: normalizedEmail,
      displayName: input.displayName,
      role: input.role,
      invitationTokenHash: hashInvitationToken(invitationToken),
      invitationExpiresAt,
    });

    const createdUser = await this.userRepository.create(user);

    const data = createdUser.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,

      action: 'USER_INVITED',

      resourceType: 'USER',
      resourceId: data.userId,
      resourceName: data.email,

      result: 'SUCCESS',
      metadata: {
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        invitationExpiresAt: data.invitationExpiresAt?.toISOString(),
      },

      occurredAt: new Date(),
    });

    await this.invitationEventPublisher.publish({
      invitationId: randomUUID(),
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      invitationUrl: buildInvitationUrl(this.configService, invitationToken),
      expiresAt: invitationExpiresAt.toISOString(),
    });

    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: 'INVITED',
      invitationStatus: 'PENDING',
      invitationExpiresAt,
      createdAt: data.createdAt,
    };
  }
}

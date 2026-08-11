import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { User, type UserRole } from '../../domain/entities/user.entity';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;

  actorUserId: string;
  actorRole: UserRole;
}

export interface CreateUserOutput {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = User.create(randomUUID(), {
      email: normalizedEmail,
      passwordHash,
      displayName: input.displayName,
      role: input.role,
    });

    const createdUser = await this.userRepository.create(user);

    const data = createdUser.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'USER_CREATED',

      resourceType: 'USER',
      resourceId: data.userId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      createdAt: data.createdAt,
    };
  }
}

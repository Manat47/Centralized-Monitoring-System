import { BadRequestException } from '@nestjs/common';

import { User } from '../../domain/entities/user.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { RefreshSessionRepository } from '../../domain/repositories/refresh-session.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { UpdateUserUseCase } from './update-user.use-case';

function createUser(role: 'ADMIN' | 'OPERATOR' = 'ADMIN'): User {
  return User.restore({
    userId: 'user-1',
    email: 'admin@example.com',
    passwordHash: 'hash',
    displayName: 'System Admin',
    role,
    status: 'ACTIVE',
    lastLoginAt: null,
    invitationTokenHash: null,
    invitationExpiresAt: null,
    invitationSentAt: null,
    invitationAcceptedAt: null,
    invitationRevokedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('UpdateUserUseCase', () => {
  const userRepository: jest.Mocked<UserRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByInvitationTokenHash: jest.fn(),
    acceptInvitation: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };
  const refreshSessionRepository: jest.Mocked<RefreshSessionRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    revokeAllByUserId: jest.fn(),
  };
  const auditEventPublisher: jest.Mocked<AuditEventPublisher> = {
    publish: jest.fn(),
  };

  const useCase = new UpdateUserUseCase(
    userRepository,
    refreshSessionRepository,
    auditEventPublisher,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects changing the current administrator role', async () => {
    userRepository.findById.mockResolvedValue(createUser());

    await expect(
      useCase.execute({
        userId: 'user-1',
        role: 'OPERATOR',
        actorUserId: 'user-1',
        actorRole: 'ADMIN',
        actorEmail: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(refreshSessionRepository.revokeAllByUserId).not.toHaveBeenCalled();
  });

  it('revokes refresh sessions when another user role changes', async () => {
    const user = createUser('OPERATOR');
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(
      async (updatedUser) => updatedUser,
    );
    refreshSessionRepository.revokeAllByUserId.mockResolvedValue(undefined);
    auditEventPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute({
      userId: 'user-1',
      role: 'ADMIN',
      actorUserId: 'admin-2',
      actorRole: 'ADMIN',
      actorEmail: 'second-admin@example.com',
    });

    expect(refreshSessionRepository.revokeAllByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.any(Date),
    );
    expect(auditEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ refreshSessionsRevoked: true }),
      }),
    );
  });
});

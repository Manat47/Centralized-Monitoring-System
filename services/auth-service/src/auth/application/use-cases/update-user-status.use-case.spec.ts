import { User } from '../../domain/entities/user.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { RefreshSessionRepository } from '../../domain/repositories/refresh-session.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { UpdateUserStatusUseCase } from './update-user-status.use-case';

function createActiveUser(): User {
  return User.restore({
    userId: 'user-1',
    email: 'operator@example.com',
    passwordHash: 'hash',
    displayName: 'Operator',
    role: 'OPERATOR',
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

describe('UpdateUserStatusUseCase', () => {
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

  const useCase = new UpdateUserStatusUseCase(
    userRepository,
    refreshSessionRepository,
    auditEventPublisher,
  );

  beforeEach(() => jest.clearAllMocks());

  it('revokes refresh sessions when a user is deactivated', async () => {
    const user = createActiveUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(
      async (updatedUser) => updatedUser,
    );
    refreshSessionRepository.revokeAllByUserId.mockResolvedValue(undefined);
    auditEventPublisher.publish.mockResolvedValue(undefined);

    await useCase.execute({
      userId: 'user-1',
      status: 'INACTIVE',
      currentUserId: 'admin-1',
      actorRole: 'ADMIN',
      actorEmail: 'admin@example.com',
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

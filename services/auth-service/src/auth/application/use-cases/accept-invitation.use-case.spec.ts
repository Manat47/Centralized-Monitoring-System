import { BadRequestException } from '@nestjs/common';

import { User } from '../../domain/entities/user.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { AcceptInvitationUseCase } from './accept-invitation.use-case';

describe('AcceptInvitationUseCase', () => {
  const userRepository = {
    acceptInvitation: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const auditEventPublisher: jest.Mocked<AuditEventPublisher> = {
    publish: jest.fn(),
  };
  const useCase = new AcceptInvitationUseCase(
    userRepository,
    passwordHasher,
    auditEventPublisher,
  );

  beforeEach(() => jest.clearAllMocks());

  it('accepts through the repository conditional update and audits it', async () => {
    const acceptedUser = User.restore({
      userId: 'user-1',
      email: 'operator@example.com',
      passwordHash: 'password-hash',
      displayName: 'Operator',
      role: 'OPERATOR',
      status: 'ACTIVE',
      lastLoginAt: null,
      invitationTokenHash: null,
      invitationExpiresAt: new Date('2026-08-27T00:00:00.000Z'),
      invitationSentAt: new Date('2026-08-25T00:00:00.000Z'),
      invitationAcceptedAt: new Date('2026-08-25T01:00:00.000Z'),
      invitationRevokedAt: null,
      createdAt: new Date('2026-08-25T00:00:00.000Z'),
      updatedAt: new Date('2026-08-25T01:00:00.000Z'),
    });
    passwordHasher.hash.mockResolvedValue('password-hash');
    userRepository.acceptInvitation.mockResolvedValue(acceptedUser);
    auditEventPublisher.publish.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ token: 'one-time-token', password: 'strong-password' }),
    ).resolves.toEqual({ email: 'operator@example.com' });

    expect(userRepository.acceptInvitation).toHaveBeenCalledWith(
      expect.any(String),
      'password-hash',
      expect.any(Date),
    );
    expect(auditEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_INVITATION_ACCEPTED' }),
    );
  });

  it('rejects when the token was already consumed or is expired', async () => {
    passwordHasher.hash.mockResolvedValue('password-hash');
    userRepository.acceptInvitation.mockResolvedValue(null);

    await expect(
      useCase.execute({ token: 'invalid-token', password: 'strong-password' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(auditEventPublisher.publish).not.toHaveBeenCalled();
  });
});

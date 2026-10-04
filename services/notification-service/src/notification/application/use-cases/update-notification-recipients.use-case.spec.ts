import { BadRequestException } from '@nestjs/common';

import { NotificationRecipient } from '../../domain/entities/notification-recipient.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { NotificationRecipientRepository } from '../../domain/ports/notification-recipient.repository';
import { UpdateNotificationRecipientsUseCase } from './update-notification-recipients.use-case';

describe('UpdateNotificationRecipientsUseCase', () => {
  const actor = {
    actorUserId: '02a411cb-25ba-46a3-aa9d-cc86d2cb2919',
    actorRole: 'ADMIN' as const,
    actorEmail: 'admin@example.com',
  };

  let repository: jest.Mocked<NotificationRecipientRepository>;
  let auditPublisher: jest.Mocked<AuditEventPublisher>;
  let useCase: UpdateNotificationRecipientsUseCase;
  let replaceAllMock: jest.Mock;
  let publishMock: jest.Mock;

  beforeEach(() => {
    replaceAllMock = jest.fn();
    repository = {
      findAll: jest.fn(),
      replaceAll: replaceAllMock,
    };
    publishMock = jest.fn();
    auditPublisher = { publish: publishMock };
    useCase = new UpdateNotificationRecipientsUseCase(
      repository,
      auditPublisher,
    );
  });

  it('normalizes recipients, preserves existing records, and audits changes', async () => {
    const existing = NotificationRecipient.create({
      recipientId: 'existing-recipient',
      email: 'existing@example.com',
    });
    repository.findAll.mockResolvedValue([existing]);

    const result = await useCase.execute({
      ...actor,
      emails: [' EXISTING@example.com ', 'new@example.com'],
    });

    expect(result[0]).toEqual(existing.toObject());
    expect(replaceAllMock).toHaveBeenCalledWith(
      expect.arrayContaining([existing, expect.any(NotificationRecipient)]),
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorEmail: actor.actorEmail,
        action: 'NOTIFICATION_RECIPIENTS_UPDATED',
        metadata: {
          added: ['new@example.com'],
          removed: [],
          recipientCount: 2,
        },
      }),
    );
  });

  it('rejects duplicates after normalization', async () => {
    await expect(
      useCase.execute({
        ...actor,
        emails: ['team@example.com', ' TEAM@example.com '],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(replaceAllMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });
});

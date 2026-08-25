import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { NotificationRecipient } from '../../domain/entities/notification-recipient.entity';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { NotificationRecipientRepository } from '../../domain/ports/notification-recipient.repository';
import type { NotificationSender } from '../../domain/ports/notification-sender.port';
import { SendTestNotificationUseCase } from './send-test-notification.use-case';

describe('SendTestNotificationUseCase', () => {
  const actor = {
    actorUserId: '02a411cb-25ba-46a3-aa9d-cc86d2cb2919',
    actorRole: 'ADMIN' as const,
    actorEmail: 'admin@example.com',
  };

  let repository: jest.Mocked<NotificationRecipientRepository>;
  let sender: jest.Mocked<NotificationSender>;
  let auditPublisher: jest.Mocked<AuditEventPublisher>;
  let useCase: SendTestNotificationUseCase;

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      replaceAll: jest.fn(),
    };
    sender = {
      send: jest.fn(),
      sendTest: jest.fn(),
    };
    auditPublisher = {
      publish: jest.fn(),
    };
    useCase = new SendTestNotificationUseCase(
      repository,
      sender,
      auditPublisher,
    );
  });

  it('rejects the test when no recipients are configured', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(useCase.execute(actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sender.sendTest).not.toHaveBeenCalled();
  });

  it('sends to every recipient and records a successful audit event', async () => {
    repository.findAll.mockResolvedValue([
      NotificationRecipient.create({
        recipientId: 'recipient-1',
        email: 'one@example.com',
      }),
      NotificationRecipient.create({
        recipientId: 'recipient-2',
        email: 'two@example.com',
      }),
    ]);

    await expect(useCase.execute(actor)).resolves.toEqual({
      recipientCount: 2,
      sentCount: 2,
      failedCount: 0,
    });
    expect(sender.sendTest).toHaveBeenCalledTimes(2);
    expect(auditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTIFICATION_TEST_SENT',
        result: 'SUCCESS',
      }),
    );
  });

  it('reports total delivery failure after recording the failed attempt', async () => {
    repository.findAll.mockResolvedValue([
      NotificationRecipient.create({
        recipientId: 'recipient-1',
        email: 'one@example.com',
      }),
    ]);
    sender.sendTest.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(useCase.execute(actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(auditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'FAILURE',
        errorCode: 'NOTIFICATION_TEST_PARTIAL_FAILURE',
      }),
    );
  });
});

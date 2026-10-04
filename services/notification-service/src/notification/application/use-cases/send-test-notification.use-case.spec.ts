import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { NotificationExecutionRouter } from '../services/notification-execution.router';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import { SendTestNotificationUseCase } from './send-test-notification.use-case';

describe('SendTestNotificationUseCase', () => {
  const actor = {
    actorUserId: '02a411cb-25ba-46a3-aa9d-cc86d2cb2919',
    actorRole: 'ADMIN' as const,
    actorEmail: 'admin@example.com',
  };

  const executeMock = jest.fn();
  const router = {
    execute: executeMock,
  } as unknown as jest.Mocked<NotificationExecutionRouter>;
  const publishMock: jest.MockedFunction<AuditEventPublisher['publish']> =
    jest.fn();
  const auditPublisher: jest.Mocked<AuditEventPublisher> = {
    publish: publishMock,
  };
  const useCase = new SendTestNotificationUseCase(router, auditPublisher);

  beforeEach(() => jest.clearAllMocks());

  it('rejects when no enabled recipients exist', async () => {
    router.execute.mockResolvedValue({
      mode: 'broadcast',
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      deliveries: [],
    });

    await expect(useCase.execute(actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('uses the router and keeps the existing test audit contract', async () => {
    router.execute.mockResolvedValue({
      mode: 'fallback',
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
      deliveries: [],
    });

    await expect(useCase.execute(actor)).resolves.toEqual({
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
    });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Notification test' }),
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTIFICATION_TEST_SENT',
        result: 'SUCCESS',
      }),
    );
    const auditEvent = publishMock.mock.calls[0][0];
    expect(auditEvent.metadata).toMatchObject({ mode: 'fallback' });
  });

  it('reports failure when every channel failed', async () => {
    router.execute.mockResolvedValue({
      mode: 'broadcast',
      recipientCount: 1,
      sentCount: 0,
      failedCount: 1,
      deliveries: [],
    });

    await expect(useCase.execute(actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'FAILURE',
        errorCode: 'NOTIFICATION_TEST_PARTIAL_FAILURE',
      }),
    );
  });
});

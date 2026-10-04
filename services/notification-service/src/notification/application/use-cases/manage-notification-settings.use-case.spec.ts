import { BadRequestException } from '@nestjs/common';

import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type {
  NotificationSettingsRecord,
  NotificationSettingsRepository,
} from '../../domain/ports/notification-settings.repository';
import type { NotificationSenderPort } from '../../domain/ports/notification-sender.port';
import { ManageNotificationSettingsUseCase } from './manage-notification-settings.use-case';

const actor = {
  actorUserId: '02a411cb-25ba-46a3-aa9d-cc86d2cb2919',
  actorRole: 'ADMIN' as const,
};

const existing: NotificationSettingsRecord = {
  isFallbackEnabled: false,
  recipients: [
    {
      recipientId: '754a2151-1dab-46fd-9954-59e0082cd62f',
      email: null,
      channel: 'webhook',
      name: 'Incident hook',
      destination: 'https://example.com/hook',
      secretToken: 'existing-secret',
      isEnabled: true,
      priority: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    },
  ],
};

describe('ManageNotificationSettingsUseCase', () => {
  const getMock = jest.fn<Promise<NotificationSettingsRecord>, []>();
  const replaceMock = jest.fn<
    Promise<NotificationSettingsRecord>,
    [NotificationSettingsRecord]
  >();
  const findRecipientMock = jest.fn();
  const publishMock = jest.fn();
  const sendAlertMock = jest.fn();
  const repository = {
    get: getMock,
    replace: replaceMock,
    findRecipient: findRecipientMock,
  } as NotificationSettingsRepository;
  const sender = {
    channel: 'webhook',
    sendAlert: sendAlertMock,
  } as NotificationSenderPort;
  const auditPublisher = { publish: publishMock } as AuditEventPublisher;
  const useCase = new ManageNotificationSettingsUseCase(
    repository,
    [sender],
    auditPublisher,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue(existing);
    replaceMock.mockImplementation((settings) => Promise.resolve(settings));
  });

  it('redacts the webhook signing secret from GET', async () => {
    const view = await useCase.get();
    expect(view.recipients[0]).toMatchObject({ hasSecretToken: true });
    expect(view.recipients[0]).not.toHaveProperty('secretToken');
  });

  it('preserves an existing secret when its input is omitted', async () => {
    const view = await useCase.update(
      {
        isFallbackEnabled: true,
        recipients: [
          {
            recipientId: existing.recipients[0].recipientId,
            channel: 'webhook',
            name: 'Incident hook',
            destination: 'https://example.com/hook',
            isEnabled: true,
            priority: 1,
          },
        ],
      },
      actor,
    );

    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: [
          expect.objectContaining({
            secretToken: 'existing-secret',
            priority: 1,
          }),
        ],
      }),
    );
    expect(view.recipients[0]).not.toHaveProperty('secretToken');
    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate fallback priority', async () => {
    await expect(
      useCase.update(
        {
          isFallbackEnabled: true,
          recipients: [
            {
              channel: 'email',
              name: 'One',
              destination: 'one@example.com',
              isEnabled: true,
              priority: 1,
            },
            {
              channel: 'email',
              name: 'Two',
              destination: 'two@example.com',
              isEnabled: true,
              priority: 1,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('tests only the selected saved channel', async () => {
    findRecipientMock.mockResolvedValue(existing.recipients[0]);
    sendAlertMock.mockResolvedValue({ success: true, isTransientError: false });
    const result = await useCase.testChannel(
      existing.recipients[0].recipientId,
      actor,
    );
    expect(result.success).toBe(true);
    expect(sendAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'https://example.com/hook',
        secretToken: 'existing-secret',
      }),
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTIFICATION_TEST_SENT',
        result: 'SUCCESS',
      }),
    );
  });
});

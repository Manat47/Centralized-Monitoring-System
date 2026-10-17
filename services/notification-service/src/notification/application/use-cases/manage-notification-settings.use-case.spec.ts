import { BadRequestException, NotFoundException } from '@nestjs/common';

import type {
  AuditEvent,
  AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
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
  const mutateMock = jest.fn<
    Promise<NotificationSettingsRecord>,
    [(current: NotificationSettingsRecord) => NotificationSettingsRecord]
  >();
  const findRecipientMock = jest.fn();
  const publishMock = jest.fn<Promise<void>, [AuditEvent]>();
  const sendAlertMock = jest.fn();
  const repository = {
    get: getMock,
    mutate: mutateMock,
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
    mutateMock.mockImplementation((change) =>
      Promise.resolve(change(existing)),
    );
    publishMock.mockResolvedValue(undefined);
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

    expect(mutateMock).toHaveBeenCalledTimes(1);
    await expect(mutateMock.mock.results[0].value).resolves.toMatchObject({
      recipients: [expect.objectContaining({ secretToken: 'existing-secret' })],
    });
    expect(view.recipients[0].priority).toBe(1);
    expect(view.recipients[0]).not.toHaveProperty('secretToken');
    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it('allows recipients to share a fallback priority', async () => {
    const recipients = [
      {
        channel: 'email' as const,
        name: 'One',
        destination: 'one@example.com',
        isEnabled: true,
        priority: 1,
      },
      {
        channel: 'email' as const,
        name: 'Two',
        destination: 'two@example.com',
        isEnabled: true,
        priority: 1,
      },
      {
        channel: 'slack' as const,
        name: 'Backup',
        destination: 'https://hooks.slack.com/services/test',
        isEnabled: true,
        priority: 2,
      },
    ];

    await useCase.update({ isFallbackEnabled: true, recipients }, actor);

    expect(mutateMock).toHaveBeenCalledTimes(1);
    await expect(mutateMock.mock.results[0].value).resolves.toMatchObject({
      recipients: recipients.map((recipient) => ({
        priority: recipient.priority,
      })),
    });
  });

  it('rejects a gap between fallback priority levels on save', async () => {
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
            {
              channel: 'slack',
              name: 'Backup',
              destination: 'https://hooks.slack.com/services/test',
              isEnabled: true,
              priority: 3,
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('creates one recipient while preserving the existing webhook secret', async () => {
    const view = await useCase.createRecipient(
      {
        channel: 'email',
        name: 'Operator',
        destination: 'OPERATOR@example.com',
        isEnabled: true,
        priority: null,
      },
      actor,
    );

    expect(view.recipients).toHaveLength(2);
    expect(view.recipients[1]).toMatchObject({
      channel: 'email',
      destination: 'operator@example.com',
    });
    await expect(mutateMock.mock.results[0].value).resolves.toMatchObject({
      recipients: [
        expect.objectContaining({ secretToken: 'existing-secret' }),
        expect.objectContaining({ email: 'operator@example.com' }),
      ],
    });
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0].metadata).toMatchObject({
      operation: 'create',
    });
  });

  it('rejects a duplicate destination without publishing an audit event', async () => {
    await expect(
      useCase.createRecipient(
        {
          channel: 'webhook',
          name: 'Duplicate',
          destination: 'https://example.com/hook',
          secretToken: 'new-secret',
          isEnabled: true,
          priority: null,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('patches one recipient and compacts remaining fallback priorities', async () => {
    const backup = {
      ...existing.recipients[0],
      recipientId: 'c4baaa46-443e-447b-9253-53af07013bf9',
      destination: 'https://example.com/backup',
      priority: 2,
    };
    mutateMock.mockImplementation((change) =>
      Promise.resolve(
        change({
          isFallbackEnabled: true,
          recipients: [{ ...existing.recipients[0], priority: 1 }, backup],
        }),
      ),
    );

    const view = await useCase.updateRecipient(
      existing.recipients[0].recipientId,
      { isEnabled: false },
      actor,
    );
    expect(view.recipients[0]).toMatchObject({
      isEnabled: false,
      hasSecretToken: true,
    });
    expect(view.recipients[1].priority).toBe(1);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0].resourceId).toBe(
      existing.recipients[0].recipientId,
    );
    expect(publishMock.mock.calls[0][0].metadata).toMatchObject({
      operation: 'update',
    });
  });

  it('deletes one recipient and closes a fallback priority gap', async () => {
    const backup = {
      ...existing.recipients[0],
      recipientId: 'c4baaa46-443e-447b-9253-53af07013bf9',
      destination: 'https://example.com/backup',
      priority: 2,
    };
    mutateMock.mockImplementation((change) =>
      Promise.resolve(
        change({
          isFallbackEnabled: true,
          recipients: [{ ...existing.recipients[0], priority: 1 }, backup],
        }),
      ),
    );

    const view = await useCase.deleteRecipient(
      existing.recipients[0].recipientId,
      actor,
    );
    expect(view.recipients).toHaveLength(1);
    expect(view.recipients[0]).toMatchObject({
      recipientId: backup.recipientId,
      priority: 1,
    });
  });

  it('keeps same-priority recipients together after removing an earlier level', async () => {
    const first = { ...existing.recipients[0], priority: 1 };
    const second = {
      ...first,
      recipientId: 'c4baaa46-443e-447b-9253-53af07013bf9',
      destination: 'https://example.com/backup-a',
      priority: 2,
    };
    const third = {
      ...first,
      recipientId: '2eaf3c8d-a862-45be-9883-f7069bc30b33',
      destination: 'https://example.com/backup-b',
      priority: 2,
    };
    mutateMock.mockImplementation((change) =>
      Promise.resolve(
        change({
          isFallbackEnabled: true,
          recipients: [first, second, third],
        }),
      ),
    );

    const view = await useCase.deleteRecipient(first.recipientId, actor);
    expect(view.recipients.map((recipient) => recipient.priority)).toEqual([
      1, 1,
    ]);
  });

  it('rejects edits to a missing recipient', async () => {
    await expect(
      useCase.updateRecipient(
        'c4baaa46-443e-447b-9253-53af07013bf9',
        { isEnabled: false },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('does not overwrite fields omitted from a partial patch', async () => {
    const view = await useCase.updateRecipient(
      existing.recipients[0].recipientId,
      { name: undefined, isEnabled: false },
      actor,
    );
    expect(view.recipients[0]).toMatchObject({
      name: 'Incident hook',
      isEnabled: false,
      hasSecretToken: true,
    });
  });

  it('rejects a create when the configured destination limit is reached', async () => {
    mutateMock.mockImplementation((change) =>
      Promise.resolve(
        change({
          isFallbackEnabled: false,
          recipients: Array.from({ length: 100 }, (_, index) => ({
            ...existing.recipients[0],
            recipientId: `754a2151-1dab-46fd-9954-${String(index).padStart(12, '0')}`,
          })),
        }),
      ),
    );
    await expect(
      useCase.createRecipient(
        {
          channel: 'email',
          name: 'Extra',
          destination: 'extra@example.com',
          isEnabled: true,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('assigns a priority when fallback routing is enabled', async () => {
    const view = await useCase.updateRouting(true, actor);
    expect(view.isFallbackEnabled).toBe(true);
    expect(view.recipients[0].priority).toBe(1);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0].metadata).toMatchObject({
      operation: 'routing',
    });
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

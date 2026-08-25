import type { NotificationSender } from '../../domain/ports/notification-sender.port';
import type { NotificationRecipientRepository } from '../../domain/ports/notification-recipient.repository';
import { NotificationRecipient } from '../../domain/entities/notification-recipient.entity';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  let notificationSender: jest.Mocked<NotificationSender>;
  let notificationRecipientRepository: jest.Mocked<NotificationRecipientRepository>;
  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    notificationSender = {
      send: jest.fn(),
      sendTest: jest.fn(),
      sendUserInvitation: jest.fn(),
    };
    notificationRecipientRepository = {
      findAll: jest.fn().mockResolvedValue([
        NotificationRecipient.create({
          recipientId: 'recipient-1',
          email: 'operator@example.com',
        }),
      ]),
      replaceAll: jest.fn(),
    };

    useCase = new SendNotificationUseCase(
      notificationSender,
      notificationRecipientRepository,
    );
  });

  it('should send a triggered alert notification', async () => {
    await useCase.execute({
      eventType: 'ALERT_TRIGGERED',
      alertId: 'alert-1',
      sourceType: 'METRIC_RULE',
      sourceId: 'rule-1',
      alertType: 'METRIC_THRESHOLD',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      message: 'CPU usage exceeded threshold',
      occurredAt: '2026-07-15T02:00:00.000Z',
    });

    expect(notificationSender.send).toHaveBeenCalledWith({
      recipientEmail: 'operator@example.com',
      alertId: 'alert-1',
      assetId: 'asset-1',
      severity: 'WARNING',
      status: 'TRIGGERED',
      alertType: 'METRIC_THRESHOLD',
      metricType: 'CPU_USAGE',
      resolutionReason: undefined,
      title: 'WARNING alert triggered',
      message: 'CPU usage exceeded threshold',
      occurredAt: new Date('2026-07-15T02:00:00.000Z'),
    });
  });

  it('should send a resolved alert notification', async () => {
    await useCase.execute({
      eventType: 'ALERT_RESOLVED',
      alertId: 'alert-1',
      sourceType: 'METRIC_RULE',
      sourceId: 'rule-1',
      alertType: 'METRIC_THRESHOLD',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      message: 'CPU usage recovered',
      occurredAt: '2026-07-15T02:05:00.000Z',
      resolutionReason: 'METRIC_RECOVERED',
    });

    expect(notificationSender.send).toHaveBeenCalledWith({
      recipientEmail: 'operator@example.com',
      alertId: 'alert-1',
      assetId: 'asset-1',
      severity: 'WARNING',
      status: 'RESOLVED',
      alertType: 'METRIC_THRESHOLD',
      metricType: 'CPU_USAGE',
      resolutionReason: 'METRIC_RECOVERED',
      title: 'WARNING alert resolved',
      message: 'CPU usage recovered',
      occurredAt: new Date('2026-07-15T02:05:00.000Z'),
    });
  });
});

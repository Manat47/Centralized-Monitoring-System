import type { NotificationSender } from '../../domain/ports/notification-sender.port';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  let notificationSender: jest.Mocked<NotificationSender>;
  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    notificationSender = {
      send: jest.fn(),
    };

    useCase = new SendNotificationUseCase(notificationSender);
  });

  it('should send a triggered alert notification', async () => {
    await useCase.execute({
      eventType: 'ALERT_TRIGGERED',
      alertId: 'alert-1',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      message: 'CPU usage exceeded threshold',
      occurredAt: '2026-07-15T02:00:00.000Z',
    });

    expect(notificationSender.send).toHaveBeenCalledWith({
      alertId: 'alert-1',
      assetId: 'asset-1',
      severity: 'WARNING',
      title: 'WARNING alert triggered',
      message: 'CPU usage exceeded threshold',
      occurredAt: new Date('2026-07-15T02:00:00.000Z'),
    });
  });

  it('should send a resolved alert notification', async () => {
    await useCase.execute({
      eventType: 'ALERT_RESOLVED',
      alertId: 'alert-1',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      message: 'CPU usage recovered',
      occurredAt: '2026-07-15T02:05:00.000Z',
    });

    expect(notificationSender.send).toHaveBeenCalledWith({
      alertId: 'alert-1',
      assetId: 'asset-1',
      severity: 'WARNING',
      title: 'WARNING alert resolved',
      message: 'CPU usage recovered',
      occurredAt: new Date('2026-07-15T02:05:00.000Z'),
    });
  });
});

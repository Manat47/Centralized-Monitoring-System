import type { NotificationExecutionRouter } from '../services/notification-execution.router';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  const executeMock = jest.fn();
  const router = {
    execute: executeMock,
  } as unknown as jest.Mocked<NotificationExecutionRouter>;
  const useCase = new SendNotificationUseCase(router);

  beforeEach(() => jest.clearAllMocks());

  it('maps a triggered event into a channel-neutral alert', async () => {
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

    expect(executeMock).toHaveBeenCalledWith({
      alertId: 'alert-1',
      assetId: 'asset-1',
      sourceId: 'rule-1',
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

  it('maps a resolved event and preserves its reason', async () => {
    await useCase.execute({
      eventType: 'ALERT_RESOLVED',
      alertId: 'alert-1',
      sourceType: 'METRIC_RULE',
      sourceId: 'rule-1',
      alertType: 'METRIC_THRESHOLD',
      ruleId: 'rule-1',
      assetId: null,
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      message: 'CPU usage recovered',
      occurredAt: '2026-07-15T02:05:00.000Z',
      resolutionReason: 'METRIC_RECOVERED',
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: null,
        status: 'RESOLVED',
        resolutionReason: 'METRIC_RECOVERED',
        title: 'WARNING alert resolved',
      }),
    );
  });
});

import type { NotificationExecutionRouter } from '../services/notification-execution.router';
import type { ConfigService } from '@nestjs/config';
import { SendNotificationUseCase } from './send-notification.use-case';

describe('SendNotificationUseCase', () => {
  const executeMock = jest.fn();
  const router = {
    execute: executeMock,
  } as unknown as jest.Mocked<NotificationExecutionRouter>;
  const config = {
    get: jest.fn().mockReturnValue('https://monitor.example'),
  } as unknown as ConfigService;
  const useCase = new SendNotificationUseCase(router, config);

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

  it('maps a log finding into the existing multi-channel router', async () => {
    await useCase.execute({
      eventId: 'event-1',
      eventType: 'log_finding_alert',
      severity: 'high',
      title: 'Database errors',
      service: 'billing',
      ruleId: 'rule-1',
      fingerprint: 'fingerprint-1',
      matchCount: 5,
      countOverflow: false,
      timeWindowSeconds: 60,
      snippet: 'Connection refused',
      deepLink: '/explorer?projectId=c4259ce4-c164-4b62-a11a-8aa01d939096',
      timestamp: '2026-10-05T00:00:00.000Z',
      isSummary: false,
    });

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        alertId: 'event-1',
        sourceId: 'rule-1',
        alertType: 'LOG_FINDING',
        severity: 'CRITICAL',
        title: 'Database errors',
        actionUrl:
          'https://monitor.example/explorer?projectId=c4259ce4-c164-4b62-a11a-8aa01d939096',
      }),
    );
    const calls = executeMock.mock.calls as Array<[{ message: string }]>;
    expect(calls[0][0].message).toContain('Connection refused');
    expect(calls[0][0].message).not.toContain('Open: /explorer');
  });

  it('does not turn an external event path into a notification link', async () => {
    await useCase.execute({
      eventId: 'event-2',
      eventType: 'log_finding_alert',
      severity: 'high',
      title: 'Database errors',
      service: 'billing',
      ruleId: 'rule-1',
      fingerprint: 'fingerprint-2',
      matchCount: 3,
      countOverflow: false,
      timeWindowSeconds: 60,
      snippet: 'Connection refused',
      deepLink: 'https://untrusted.example/explorer',
      timestamp: '2026-10-05T00:00:00.000Z',
      isSummary: false,
    });
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ actionUrl: undefined }),
    );
  });
});

import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import type { HealthCheckAlertState } from '../../domain/entities/health-check-alert-state.entity';
import type { NotificationEventPublisher } from '../../domain/port/notification-event-publisher.port';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import type { HealthCheckAlertStateRepository } from '../../domain/repositories/health-check-alert-state.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

describe('ProcessAlertEventUseCase', () => {
  let alertRepository: jest.Mocked<AlertRepository>;
  let healthStateRepository: jest.Mocked<HealthCheckAlertStateRepository>;
  let notificationEventPublisher: jest.Mocked<NotificationEventPublisher>;
  let useCase: ProcessAlertEventUseCase;

  beforeEach(() => {
    alertRepository = {
      create: jest.fn(),
      findActiveByRuleId: jest.fn(),
      findActiveByDedupKey: jest.fn(),
      findActiveBySource: jest.fn(),
      findActiveByAssetId: jest.fn(),
      findAll: jest.fn(),
      findForReport: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      appendLifecycleEvent: jest.fn(),
      findLifecycleEvents: jest.fn(),
      claimEvent: jest.fn().mockResolvedValue(true),
      releaseEvent: jest.fn(),
    };
    healthStateRepository = {
      findByTargetId: jest.fn(),
      findStaleCandidates: jest.fn(),
      save: jest.fn(),
    };
    notificationEventPublisher = { publish: jest.fn() };
    useCase = new ProcessAlertEventUseCase(
      alertRepository,
      healthStateRepository,
      notificationEventPublisher,
    );
  });

  it('creates a triggered metric alert and lifecycle event', async () => {
    alertRepository.findActiveByDedupKey.mockResolvedValue(null);
    alertRepository.create.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_EXCEEDED',
      ruleId: randomUUID(),
      assetId: randomUUID(),
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      occurredAt: '2026-07-14T10:00:00.000Z',
      message: 'CPU usage exceeded threshold',
    });

    expect(result?.toObject().status).toBe('TRIGGERED');
    expect(alertRepository.create).toHaveBeenCalledTimes(1);
    expect(alertRepository.appendLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'TRIGGERED' }),
    );
    expect(notificationEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ALERT_TRIGGERED' }),
    );
  });

  it('does not create a duplicate active metric alert', async () => {
    const existingAlert = Alert.create(randomUUID(), {
      ruleId: randomUUID(),
      assetId: randomUUID(),
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });
    alertRepository.findActiveByDedupKey.mockResolvedValue(existingAlert);

    const data = existingAlert.toObject();
    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_EXCEEDED',
      ruleId: data.sourceId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      thresholdValue: 80,
      actualValue: 95,
      occurredAt: '2026-07-14T10:05:00.000Z',
      message: 'CPU usage exceeded threshold',
    });

    expect(result).toBe(existingAlert);
    expect(alertRepository.create).not.toHaveBeenCalled();
  });

  it('resolves an active metric alert', async () => {
    const ruleId = randomUUID();
    const existingAlert = Alert.create(randomUUID(), {
      ruleId,
      assetId: randomUUID(),
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });
    alertRepository.findActiveByDedupKey.mockResolvedValue(existingAlert);
    alertRepository.update.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId,
      assetId: existingAlert.toObject().assetId,
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    expect(result?.toObject().status).toBe('RESOLVED');
    expect(alertRepository.appendLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'RESOLVED' }),
    );
  });

  it('resolves an active metric alert when its rule is disabled', async () => {
    const ruleId = randomUUID();
    const existingAlert = Alert.create(randomUUID(), {
      ruleId,
      assetId: randomUUID(),
      metricType: 'MEMORY_USAGE',
      severity: 'CRITICAL',
      thresholdValue: 90,
      actualValue: 95,
      message: 'Memory usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });
    alertRepository.findActiveByDedupKey.mockResolvedValue(existingAlert);
    alertRepository.update.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_RULE_STATE_CHANGED',
      ruleId,
      assetId: existingAlert.toObject().assetId,
      state: 'DISABLED',
      occurredAt: '2026-07-14T10:05:00.000Z',
      message: 'Metric alert resolved because its rule was disabled',
    });

    expect(result?.toObject()).toMatchObject({
      status: 'RESOLVED',
      resolutionReason: 'METRIC_RULE_DISABLED',
    });
  });

  it('ignores a duplicate event id', async () => {
    alertRepository.claimEvent.mockResolvedValue(false);

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId: randomUUID(),
      assetId: randomUUID(),
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    expect(result).toBeNull();
    expect(alertRepository.findActiveByDedupKey).not.toHaveBeenCalled();
  });

  it('triggers a health alert after two consecutive failures', async () => {
    let persistedState: HealthCheckAlertState | null = null;
    healthStateRepository.findByTargetId.mockImplementation(() =>
      Promise.resolve(persistedState),
    );
    healthStateRepository.save.mockImplementation((state) => {
      persistedState = state;
      return Promise.resolve(state);
    });
    alertRepository.create.mockImplementation((alert) =>
      Promise.resolve(alert),
    );
    alertRepository.findActiveByDedupKey.mockResolvedValue(null);

    const base = {
      eventType: 'HEALTH_CHECK_RESULT_RECORDED' as const,
      healthCheckTargetId: randomUUID(),
      assetId: randomUUID(),
      url: 'https://example.com/health',
      checkIntervalSeconds: 15,
      statusCode: 500,
      responseTimeMs: 42,
      error: null,
    };

    await useCase.execute({
      ...base,
      eventId: randomUUID(),
      occurredAt: '2026-07-14T10:00:00.000Z',
    });
    const result = await useCase.execute({
      ...base,
      eventId: randomUUID(),
      occurredAt: '2026-07-14T10:00:15.000Z',
    });

    expect(result?.toObject()).toMatchObject({
      sourceType: 'HEALTH_CHECK',
      alertType: 'ENDPOINT_UNAVAILABLE',
      status: 'TRIGGERED',
      actualText: 'HTTP 500',
    });
  });
});

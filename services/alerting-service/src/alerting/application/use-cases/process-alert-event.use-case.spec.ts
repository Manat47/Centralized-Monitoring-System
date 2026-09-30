import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import { HealthCheckAlertState } from '../../domain/entities/health-check-alert-state.entity';
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
      resolveIfActive: jest.fn(),
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
    expect(alertRepository.create.mock.calls).toHaveLength(1);
    expect(alertRepository.appendLifecycleEvent.mock.calls).toContainEqual([
      expect.objectContaining({ eventType: 'TRIGGERED' }),
    ]);
    expect(notificationEventPublisher.publish.mock.calls).toContainEqual([
      expect.objectContaining({ eventType: 'ALERT_TRIGGERED' }),
    ]);
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
    expect(alertRepository.create.mock.calls).toHaveLength(0);
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
    alertRepository.resolveIfActive.mockImplementation((alert) =>
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
    expect(alertRepository.appendLifecycleEvent.mock.calls).toContainEqual([
      expect.objectContaining({ eventType: 'RESOLVED' }),
    ]);
  });

  it('does not publish a duplicate resolution when another worker resolved the alert first', async () => {
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
    alertRepository.resolveIfActive.mockResolvedValue(null);

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

    expect(result).toBeNull();
    expect(alertRepository.appendLifecycleEvent).not.toHaveBeenCalled();
    expect(notificationEventPublisher.publish).not.toHaveBeenCalled();
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
    alertRepository.resolveIfActive.mockImplementation((alert) =>
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

  it('resolves only metric alerts when a monitoring target is archived', async () => {
    const assetId = randomUUID();
    const metricAlert = Alert.create(randomUUID(), {
      ruleId: randomUUID(),
      assetId,
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-08-28T10:00:00.000Z'),
    });
    const healthAlert = Alert.create(randomUUID(), {
      sourceType: 'HEALTH_CHECK',
      sourceId: randomUUID(),
      alertType: 'ENDPOINT_UNAVAILABLE',
      assetId,
      metricType: 'HTTP',
      severity: 'CRITICAL',
      actualText: 'No response',
      message: 'Endpoint unavailable',
      triggeredAt: new Date('2026-08-28T10:00:00.000Z'),
    });
    alertRepository.findActiveByAssetId.mockResolvedValue([
      metricAlert,
      healthAlert,
    ]);
    alertRepository.resolveIfActive.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'MONITORING_TARGET_STATE_CHANGED',
      monitoringTargetId: randomUUID(),
      assetId,
      monitoringType: 'NODE_EXPORTER',
      state: 'ARCHIVED',
      occurredAt: '2026-08-28T10:05:00.000Z',
    });

    expect(result).toBeNull();
    expect(metricAlert.toObject()).toMatchObject({
      status: 'RESOLVED',
      resolutionReason: 'MONITORING_TARGET_ARCHIVED',
    });
    expect(healthAlert.toObject().status).toBe('TRIGGERED');
    expect(alertRepository.resolveIfActive.mock.calls).toHaveLength(1);
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
    expect(alertRepository.findActiveByDedupKey.mock.calls).toHaveLength(0);
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

  it('keeps a stale alert active when a delayed result is still outside the grace period', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T10:03:10.000Z'));
    try {
      const healthCheckTargetId = randomUUID();
      const assetId = randomUUID();
      const state = HealthCheckAlertState.create({
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 15,
      });
      state.recordResult(
        {
          statusCode: 200,
          responseTimeMs: 42,
          error: null,
          occurredAt: new Date('2026-09-30T10:00:00.000Z'),
        },
        2,
        2,
      );
      state.markStale(new Date('2026-09-30T10:03:00.000Z'));
      const staleAlert = Alert.create(randomUUID(), {
        sourceType: 'HEALTH_CHECK',
        sourceId: healthCheckTargetId,
        alertType: 'HEALTH_CHECK_STALE',
        dedupKey: `HEALTH_CHECK:${healthCheckTargetId}:HEALTH_CHECK_STALE`,
        assetId,
        metricType: 'HTTP',
        severity: 'WARNING',
        actualText: 'No recent result',
        message: 'No recent health check result',
        triggeredAt: new Date('2026-09-30T10:03:00.000Z'),
      });
      healthStateRepository.findByTargetId.mockResolvedValue(state);
      healthStateRepository.save.mockImplementation((saved) =>
        Promise.resolve(saved),
      );
      alertRepository.findActiveByDedupKey.mockResolvedValue(staleAlert);
      alertRepository.resolveIfActive.mockImplementation((alert) =>
        Promise.resolve(alert),
      );

      await useCase.execute({
        eventId: randomUUID(),
        eventType: 'HEALTH_CHECK_RESULT_RECORDED',
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 15,
        statusCode: 200,
        responseTimeMs: 42,
        error: null,
        occurredAt: '2026-09-30T10:00:15.000Z',
      });

      expect(state.toObject().state).toBe('STALE');
      expect(staleAlert.toObject().status).toBe('TRIGGERED');
      expect(alertRepository.resolveIfActive.mock.calls).toHaveLength(0);

      jest.setSystemTime(new Date('2026-09-30T10:03:20.000Z'));
      await useCase.execute({
        eventId: randomUUID(),
        eventType: 'HEALTH_CHECK_RESULT_RECORDED',
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 15,
        statusCode: 200,
        responseTimeMs: 42,
        error: null,
        occurredAt: '2026-09-30T10:03:15.000Z',
      });

      expect(state.toObject().state).toBe('HEALTHY');
      expect(staleAlert.toObject().status).toBe('RESOLVED');
      expect(alertRepository.resolveIfActive.mock.calls).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

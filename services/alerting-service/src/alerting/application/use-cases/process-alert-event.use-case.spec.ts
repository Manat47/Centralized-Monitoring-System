import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import { HealthCheckAlertState } from '../../domain/entities/health-check-alert-state.entity';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import type { HealthCheckAlertStateRepository } from '../../domain/repositories/health-check-alert-state.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

describe('ProcessAlertEventUseCase', () => {
  let alertRepository: jest.Mocked<AlertRepository>;
  let healthStateRepository: jest.Mocked<HealthCheckAlertStateRepository>;
  let useCase: ProcessAlertEventUseCase;

  beforeEach(() => {
    alertRepository = {
      createWithNotification: jest.fn(),
      resolveWithNotification: jest.fn(),
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
      markStaleIfCurrent: jest.fn(),
      disableByAssetId: jest.fn(),
      save: jest.fn(),
    };
    useCase = new ProcessAlertEventUseCase(
      alertRepository,
      healthStateRepository,
    );
  });

  it('creates a triggered metric alert and lifecycle event', async () => {
    alertRepository.findActiveByDedupKey.mockResolvedValue(null);
    alertRepository.createWithNotification.mockImplementation((alert) =>
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
    expect(alertRepository.createWithNotification).toHaveBeenCalledWith(
      expect.any(Alert),
      expect.objectContaining({ eventType: 'TRIGGERED' }),
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
      assetId: data.assetId!,
      metricType: data.metricType,
      severity: data.severity,
      thresholdValue: 80,
      actualValue: 95,
      occurredAt: '2026-07-14T10:05:00.000Z',
      message: 'CPU usage exceeded threshold',
    });

    expect(result).toBe(existingAlert);
    expect(alertRepository.createWithNotification.mock.calls).toHaveLength(0);
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
    alertRepository.resolveWithNotification.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId,
      assetId: existingAlert.toObject().assetId!,
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    expect(result?.toObject().status).toBe('RESOLVED');
    expect(alertRepository.resolveWithNotification).toHaveBeenCalledWith(
      expect.any(Alert),
      expect.objectContaining({ eventType: 'RESOLVED' }),
      expect.objectContaining({ eventType: 'ALERT_RESOLVED' }),
    );
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
    alertRepository.resolveWithNotification.mockResolvedValue(null);

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId,
      assetId: existingAlert.toObject().assetId!,
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    expect(result).toBeNull();
    expect(alertRepository.resolveWithNotification).toHaveBeenCalledTimes(1);
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
    alertRepository.resolveWithNotification.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventId: randomUUID(),
      eventType: 'METRIC_RULE_STATE_CHANGED',
      ruleId,
      assetId: existingAlert.toObject().assetId!,
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
    alertRepository.resolveWithNotification.mockImplementation((alert) =>
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
    expect(alertRepository.resolveWithNotification.mock.calls).toHaveLength(1);
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
    alertRepository.createWithNotification.mockImplementation((alert) =>
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

  it('uses heartbeat for freshness and opens or resolves only on transition events', async () => {
    let persistedState: HealthCheckAlertState | null = null;
    healthStateRepository.findByTargetId.mockImplementation(() =>
      Promise.resolve(persistedState),
    );
    healthStateRepository.save.mockImplementation((state) => {
      persistedState = state;
      return Promise.resolve(state);
    });
    alertRepository.findActiveByDedupKey.mockResolvedValue(null);
    alertRepository.createWithNotification.mockImplementation((alert) =>
      Promise.resolve(alert),
    );
    alertRepository.resolveWithNotification.mockImplementation((alert) =>
      Promise.resolve(alert),
    );
    const base = {
      healthCheckTargetId: randomUUID(),
      assetId: randomUUID(),
      url: 'https://example.com/health',
      checkIntervalSeconds: 30,
      statusCode: 500,
      responseTimeMs: 42,
      error: null,
    };
    await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_RESULT_RECORDED',
      heartbeatOnly: true,
      alertActive: false,
      occurredAt: '2026-10-01T10:00:00Z',
    });
    expect(alertRepository.createWithNotification).not.toHaveBeenCalled();

    const opened = await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_FAILED',
      alertActive: true,
      occurredAt: '2026-10-01T10:01:00Z',
    });
    expect(opened?.toObject().alertType).toBe('ENDPOINT_UNAVAILABLE');
    alertRepository.findActiveByDedupKey.mockResolvedValue(opened);

    await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_RECOVERED',
      statusCode: 200,
      alertActive: false,
      occurredAt: '2026-10-01T10:01:30Z',
    });
    expect(opened?.toObject().status).toBe('RESOLVED');
    expect(alertRepository.createWithNotification).toHaveBeenCalledTimes(1);
  });

  it('opens and resolves a standalone health alert without an asset', async () => {
    let persistedState: HealthCheckAlertState | null = null;
    let opened: Alert | null = null;
    healthStateRepository.findByTargetId.mockImplementation(() =>
      Promise.resolve(persistedState),
    );
    healthStateRepository.save.mockImplementation((state) => {
      persistedState = state;
      return Promise.resolve(state);
    });
    alertRepository.findActiveByDedupKey.mockImplementation((key) =>
      Promise.resolve(key.endsWith('ENDPOINT_UNAVAILABLE') ? opened : null),
    );
    alertRepository.createWithNotification.mockImplementation((alert) => {
      opened = alert;
      return Promise.resolve(alert);
    });
    alertRepository.resolveWithNotification.mockImplementation((alert) =>
      Promise.resolve(alert),
    );
    const healthCheckTargetId = randomUUID();
    const base = {
      healthCheckTargetId,
      assetId: null,
      url: 'https://example.com/ready',
      checkIntervalSeconds: 30,
    };

    await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED',
      state: 'RUNNING',
      occurredAt: '2026-10-02T10:00:00.000Z',
    });
    const failed = await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_FAILED',
      available: false,
      statusCode: null,
      responseTimeMs: 42,
      error: 'Connection refused',
      occurredAt: '2026-10-02T10:01:00.000Z',
    });
    expect(failed?.toObject()).toMatchObject({
      assetId: null,
      alertType: 'ENDPOINT_UNAVAILABLE',
      status: 'TRIGGERED',
    });

    await useCase.execute({
      ...base,
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_RECOVERED',
      available: true,
      statusCode: 200,
      responseTimeMs: 42,
      error: null,
      occurredAt: '2026-10-02T10:02:00.000Z',
    });
    expect(
      alertRepository.resolveWithNotification.mock.calls[0]?.[0].toObject()
        .status,
    ).toBe('RESOLVED');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.createWithNotification).toHaveBeenCalledTimes(1);
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
      alertRepository.resolveWithNotification.mockImplementation((alert) =>
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
      expect(alertRepository.resolveWithNotification.mock.calls).toHaveLength(
        0,
      );

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
      expect(alertRepository.resolveWithNotification.mock.calls).toHaveLength(
        1,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('resolves an orphaned stale alert when a fresh result arrives after state recovered', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T10:03:20.000Z'));
    try {
      const healthCheckTargetId = randomUUID();
      const assetId = randomUUID();
      const state = HealthCheckAlertState.create({
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 30,
      });
      state.recordHeartbeat(
        {
          statusCode: 200,
          responseTimeMs: 42,
          error: null,
          occurredAt: new Date('2026-10-02T10:03:00.000Z'),
        },
        false,
      );
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
        triggeredAt: new Date('2026-10-02T10:02:00.000Z'),
      });
      healthStateRepository.findByTargetId.mockResolvedValue(state);
      healthStateRepository.save.mockResolvedValue(state);
      alertRepository.findActiveByDedupKey.mockResolvedValue(staleAlert);
      alertRepository.resolveWithNotification.mockImplementation((alert) =>
        Promise.resolve(alert),
      );

      await useCase.execute({
        eventId: randomUUID(),
        eventType: 'HEALTH_CHECK_RESULT_RECORDED',
        heartbeatOnly: true,
        alertActive: false,
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 30,
        statusCode: 200,
        responseTimeMs: 42,
        error: null,
        occurredAt: '2026-10-02T10:03:15.000Z',
      });

      expect(staleAlert.toObject().status).toBe('RESOLVED');
      expect(alertRepository.resolveWithNotification).toHaveBeenCalledWith(
        expect.any(Alert),
        expect.objectContaining({ reason: 'HEALTH_CHECK_DATA_RESUMED' }),
        expect.any(Object),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('reconciles a stale alert when the same fresh result is retried', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T10:03:20.000Z'));
    try {
      const healthCheckTargetId = randomUUID();
      const assetId = randomUUID();
      const state = HealthCheckAlertState.create({
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 30,
      });
      const occurredAt = new Date('2026-10-02T10:03:15.000Z');
      state.recordHeartbeat(
        { statusCode: 200, responseTimeMs: 42, error: null, occurredAt },
        false,
      );
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
        triggeredAt: new Date('2026-10-02T10:02:00.000Z'),
      });
      healthStateRepository.findByTargetId.mockResolvedValue(state);
      alertRepository.findActiveByDedupKey.mockResolvedValue(staleAlert);
      alertRepository.resolveWithNotification.mockImplementation((alert) =>
        Promise.resolve(alert),
      );

      await useCase.execute({
        eventId: randomUUID(),
        eventType: 'HEALTH_CHECK_RESULT_RECORDED',
        heartbeatOnly: true,
        alertActive: false,
        healthCheckTargetId,
        assetId,
        url: 'https://example.com/health',
        checkIntervalSeconds: 30,
        statusCode: 200,
        responseTimeMs: 42,
        error: null,
        occurredAt: occurredAt.toISOString(),
      });

      expect(staleAlert.toObject().status).toBe('RESOLVED');
      expect(healthStateRepository.save).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

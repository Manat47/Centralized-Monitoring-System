import { HealthCheckAlertState } from './health-check-alert-state.entity';

describe('HealthCheckAlertState', () => {
  const createState = () =>
    HealthCheckAlertState.create({
      healthCheckTargetId: 'target-1',
      assetId: 'asset-1',
      url: 'https://example.com/health',
      checkIntervalSeconds: 15,
    });

  it('requires two consecutive failures before entering alerted state', () => {
    const state = createState();

    state.recordResult(
      {
        statusCode: 500,
        responseTimeMs: 120,
        error: null,
        occurredAt: new Date('2026-08-24T10:00:00Z'),
      },
      2,
      2,
    );
    expect(state.toObject().state).toBe('FAILING');

    state.recordResult(
      {
        statusCode: null,
        responseTimeMs: 3000,
        error: 'Connection refused',
        occurredAt: new Date('2026-08-24T10:00:15Z'),
      },
      2,
      2,
    );
    expect(state.toObject()).toMatchObject({
      state: 'ALERTED',
      consecutiveFailures: 2,
      consecutiveSuccesses: 0,
    });
  });

  it('requires two consecutive successes to recover from an alert', () => {
    const state = createState();
    const record = (statusCode: number, occurredAt: string) =>
      state.recordResult(
        {
          statusCode,
          responseTimeMs: 80,
          error: null,
          occurredAt: new Date(occurredAt),
        },
        2,
        2,
      );

    record(500, '2026-08-24T10:00:00Z');
    record(500, '2026-08-24T10:00:15Z');
    record(200, '2026-08-24T10:00:30Z');
    expect(state.toObject().state).toBe('RECOVERING');

    record(200, '2026-08-24T10:00:45Z');
    expect(state.toObject().state).toBe('HEALTHY');
  });

  it('treats only successful HTTP responses as available', () => {
    const state = createState();

    state.recordResult(
      {
        statusCode: 302,
        responseTimeMs: 40,
        error: null,
        occurredAt: new Date('2026-08-24T10:00:00Z'),
      },
      2,
      2,
    );

    expect(state.toObject().state).toBe('FAILING');
  });

  it('marks data stale only after the configured grace period', () => {
    const state = createState();
    state.recordResult(
      {
        statusCode: 200,
        responseTimeMs: 50,
        error: null,
        occurredAt: new Date('2026-08-24T10:00:00Z'),
      },
      2,
      2,
    );

    expect(state.markStale(new Date('2026-08-24T10:00:34Z'))).toBe(false);
    expect(state.markStale(new Date('2026-08-24T10:00:36Z'))).toBe(true);
    expect(state.toObject().state).toBe('STALE');
  });

  it('does not mark paused or archived targets stale', () => {
    const state = createState();
    state.recordResult(
      {
        statusCode: 200,
        responseTimeMs: 50,
        error: null,
        occurredAt: new Date('2026-08-24T10:00:00Z'),
      },
      2,
      2,
    );
    state.configure({
      assetId: 'asset-1',
      url: 'https://example.com/health',
      checkIntervalSeconds: 15,
      enabled: false,
      archived: false,
      occurredAt: new Date('2026-08-24T10:00:10Z'),
    });

    expect(state.markStale(new Date('2026-08-24T10:05:00Z'))).toBe(false);
    expect(state.toObject().state).toBe('UNKNOWN');
  });
});

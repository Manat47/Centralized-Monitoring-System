import {
  type AssetResponse,
  buildDashboardOverview,
  type DashboardOverviewInput,
  type MonitoringTargetResponse,
} from './dashboard-overview';

describe('buildDashboardOverview', () => {
  const now = new Date('2026-08-29T10:00:00.000Z');

  function asset(
    overrides: Partial<AssetResponse> & Pick<AssetResponse, 'assetId' | 'name'>,
  ): AssetResponse {
    return {
      assetId: overrides.assetId,
      name: overrides.name,
      hostname: null,
      targetType: 'SERVER',
      ipAddress: '10.20.1.11',
      endpoint: null,
      environment: 'PRODUCTION',
      status: 'ACTIVATE',
      updatedAt: '2026-08-29T09:00:00.000Z',
      ...overrides,
    };
  }

  function target(
    overrides: Partial<MonitoringTargetResponse> &
      Pick<MonitoringTargetResponse, 'assetId'>,
  ): MonitoringTargetResponse {
    return {
      targetId: `target-${overrides.assetId}`,
      assetId: overrides.assetId,
      monitoringType: 'NODE_EXPORTER',
      scrapeIntervalSeconds: 15,
      verificationStatus: 'VERIFIED',
      monitoringEnabled: true,
      archivedAt: null,
      lastCollectedAt: '2026-08-29T09:59:50.000Z',
      lastError: null,
      updatedAt: '2026-08-29T09:59:50.000Z',
      ...overrides,
    };
  }

  function build(overrides: Partial<DashboardOverviewInput>) {
    return buildDashboardOverview({
      assets: [],
      monitoringTargets: [],
      healthCheckTargets: [],
      alerts: [],
      metrics: [],
      now,
      ...overrides,
    });
  }

  it('marks a server OK only when telemetry is fresh and no alerts are active', () => {
    const result = build({
      assets: [asset({ assetId: 'asset-1', name: 'prod-web-01' })],
      monitoringTargets: [target({ assetId: 'asset-1' })],
      metrics: [
        {
          assetId: 'asset-1',
          timestamp: '2026-08-29T09:59:50.000Z',
          cpuUsagePercent: 45.5,
          memoryUsagePercent: 61.2,
        },
      ],
    });

    expect(result.assets).toMatchObject({ total: 1, ok: 1 });
    expect(result.assetOverview[0]).toMatchObject({
      overallStatus: 'OK',
      telemetry: { status: 'FRESH' },
      metrics: { cpuUsagePercent: 45.5, memoryUsagePercent: 61.2 },
    });
  });

  it('uses active alert severity before signal-derived status', () => {
    const result = build({
      assets: [asset({ assetId: 'asset-1', name: 'prod-web-01' })],
      monitoringTargets: [target({ assetId: 'asset-1' })],
      alerts: [
        {
          alertId: 'alert-1',
          assetId: 'asset-1',
          severity: 'CRITICAL',
          status: 'ACKNOWLEDGED',
          message: 'CPU threshold exceeded',
          triggeredAt: '2026-08-29T09:58:00.000Z',
        },
      ],
    });

    expect(result.assetOverview[0]).toMatchObject({
      overallStatus: 'CRITICAL',
      statusReason: 'CPU threshold exceeded',
      alerts: { active: 1, critical: 1 },
    });
  });

  it('aggregates multiple application health checks', () => {
    const application = asset({
      assetId: 'asset-2',
      name: 'billing-api',
      targetType: 'APPLICATION',
      ipAddress: null,
      endpoint: 'https://billing.example.com',
    });
    const result = build({
      assets: [application],
      healthCheckTargets: [
        {
          healthCheckTargetId: 'health-1',
          assetId: 'asset-2',
          checkIntervalSeconds: 30,
          enabled: true,
          archivedAt: null,
          lastCheckedAt: '2026-08-29T09:59:45.000Z',
          latest: {
            timestamp: '2026-08-29T09:59:45.000Z',
            statusCode: 200,
            responseTimeMs: 80,
            error: null,
          },
        },
        {
          healthCheckTargetId: 'health-2',
          assetId: 'asset-2',
          checkIntervalSeconds: 30,
          enabled: true,
          archivedAt: null,
          lastCheckedAt: '2026-08-29T09:59:45.000Z',
          latest: {
            timestamp: '2026-08-29T09:59:45.000Z',
            statusCode: 503,
            responseTimeMs: 120,
            error: null,
          },
        },
      ],
    });

    expect(result.assetOverview[0]).toMatchObject({
      overallStatus: 'WARNING',
      healthChecks: {
        status: 'UNAVAILABLE',
        total: 2,
        available: 1,
        responseTimeMs: 100,
      },
    });
  });

  it('keeps stale, unconfigured, and inactive states distinct', () => {
    const result = build({
      assets: [
        asset({ assetId: 'stale', name: 'stale-server' }),
        asset({ assetId: 'missing', name: 'unmonitored-server' }),
        asset({
          assetId: 'inactive',
          name: 'inactive-server',
          status: 'INACTIVATE',
        }),
      ],
      monitoringTargets: [
        target({
          assetId: 'stale',
          lastCollectedAt: '2026-08-29T09:50:00.000Z',
        }),
      ],
    });

    expect(result.assetOverview.map((item) => item.overallStatus)).toEqual([
      'NO_DATA',
      'NOT_MONITORED',
      'INACTIVE',
    ]);
  });
});

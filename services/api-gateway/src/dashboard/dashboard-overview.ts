export type AssetTargetType = 'SERVER' | 'APPLICATION' | 'SERVICE';
export type AssetEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type AssetLifecycleStatus = 'ACTIVATE' | 'INACTIVATE' | 'DEACTIVATE';
export type AssetOverallStatus =
  'OK' | 'WARNING' | 'CRITICAL' | 'NO_DATA' | 'NOT_MONITORED' | 'INACTIVE';

export type TelemetryStatus =
  'FRESH' | 'STALE' | 'FAILED' | 'NO_DATA' | 'PAUSED' | 'NOT_CONFIGURED';

export type HealthStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'STALE'
  | 'UNKNOWN'
  | 'PAUSED'
  | 'NOT_CONFIGURED';

export interface AssetResponse {
  assetId: string;
  name: string;
  hostname: string | null;
  targetType: AssetTargetType;
  ipAddress: string | null;
  endpoint: string | null;
  environment: AssetEnvironment;
  status: AssetLifecycleStatus;
  updatedAt: string;
}

export interface MonitoringTargetResponse {
  targetId: string;
  assetId: string;
  monitoringType: 'NODE_EXPORTER' | 'PROMETHEUS_APPLICATION';
  scrapeIntervalSeconds: number;
  verificationStatus: 'NOT_VERIFIED' | 'VERIFIED' | 'FAILED';
  monitoringEnabled: boolean;
  archivedAt: string | null;
  lastCollectedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface LatestHealthCheckResponse {
  timestamp: string;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

export interface HealthCheckTargetResponse {
  healthCheckTargetId: string;
  assetId: string;
  checkIntervalSeconds: number;
  enabled: boolean;
  archivedAt: string | null;
  lastCheckedAt: string | null;
  latest: LatestHealthCheckResponse | null;
}

export interface AlertResponse {
  alertId: string;
  assetId: string;
  severity: 'WARNING' | 'CRITICAL';
  status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';
  message: string;
  triggeredAt: string;
}

export interface LatestMetricsSummaryResponse {
  assetId: string;
  timestamp: string | null;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
}

export interface DashboardAssetOverview {
  assetId: string;
  name: string;
  targetType: AssetTargetType;
  environment: AssetEnvironment;
  address: string | null;
  lifecycleStatus: AssetLifecycleStatus;
  overallStatus: AssetOverallStatus;
  statusReason: string;
  telemetry: {
    status: TelemetryStatus;
    lastCollectedAt: string | null;
    lastError: string | null;
  } | null;
  healthChecks: {
    status: HealthStatus;
    total: number;
    available: number;
    responseTimeMs: number | null;
    lastCheckedAt: string | null;
  } | null;
  alerts: {
    active: number;
    warning: number;
    critical: number;
  };
  metrics: {
    cpuUsagePercent: number | null;
    memoryUsagePercent: number | null;
    timestamp: string | null;
  } | null;
  updatedAt: string;
}

export interface DashboardOverviewInput {
  assets: AssetResponse[];
  monitoringTargets: MonitoringTargetResponse[];
  healthCheckTargets: HealthCheckTargetResponse[];
  alerts: AlertResponse[];
  metrics: LatestMetricsSummaryResponse[];
  now?: Date;
}

function isApplication(type: AssetTargetType): boolean {
  return type === 'APPLICATION' || type === 'SERVICE';
}

function isFresh(
  timestamp: string,
  intervalSeconds: number,
  now: Date,
): boolean {
  const staleAfterMs = Math.max((intervalSeconds * 2 + 5) * 1000, 30_000);
  return now.getTime() - new Date(timestamp).getTime() <= staleAfterMs;
}

function getTelemetry(
  target: MonitoringTargetResponse | undefined,
  now: Date,
): DashboardAssetOverview['telemetry'] {
  if (!target) {
    return {
      status: 'NOT_CONFIGURED',
      lastCollectedAt: null,
      lastError: null,
    };
  }

  if (!target.monitoringEnabled) {
    return {
      status: 'PAUSED',
      lastCollectedAt: target.lastCollectedAt,
      lastError: target.lastError,
    };
  }

  if (target.verificationStatus === 'FAILED') {
    return {
      status: 'FAILED',
      lastCollectedAt: target.lastCollectedAt,
      lastError: target.lastError,
    };
  }

  if (!target.lastCollectedAt) {
    return {
      status: 'NO_DATA',
      lastCollectedAt: null,
      lastError: target.lastError,
    };
  }

  if (!isFresh(target.lastCollectedAt, target.scrapeIntervalSeconds, now)) {
    return {
      status: target.lastError ? 'FAILED' : 'STALE',
      lastCollectedAt: target.lastCollectedAt,
      lastError: target.lastError,
    };
  }

  return {
    status: 'FRESH',
    lastCollectedAt: target.lastCollectedAt,
    lastError: target.lastError,
  };
}

function getHealthChecks(
  targets: HealthCheckTargetResponse[],
  now: Date,
): DashboardAssetOverview['healthChecks'] {
  if (targets.length === 0) {
    return {
      status: 'NOT_CONFIGURED',
      total: 0,
      available: 0,
      responseTimeMs: null,
      lastCheckedAt: null,
    };
  }

  const enabledTargets = targets.filter((target) => target.enabled);

  if (enabledTargets.length === 0) {
    return {
      status: 'PAUSED',
      total: targets.length,
      available: 0,
      responseTimeMs: null,
      lastCheckedAt: null,
    };
  }

  let available = 0;
  let unavailable = 0;
  let stale = 0;
  let unknown = 0;
  const responseTimes: number[] = [];
  const checkedTimestamps: string[] = [];

  for (const target of enabledTargets) {
    const latest = target.latest;

    if (!latest) {
      unknown += 1;
      continue;
    }

    checkedTimestamps.push(latest.timestamp);
    responseTimes.push(latest.responseTimeMs);

    if (!isFresh(latest.timestamp, target.checkIntervalSeconds, now)) {
      stale += 1;
    } else if (
      latest.statusCode !== null &&
      latest.statusCode >= 200 &&
      latest.statusCode < 300
    ) {
      available += 1;
    } else {
      unavailable += 1;
    }
  }

  const status: HealthStatus =
    unavailable > 0
      ? 'UNAVAILABLE'
      : stale > 0
        ? 'STALE'
        : unknown > 0
          ? 'UNKNOWN'
          : 'AVAILABLE';
  const lastCheckedAt = checkedTimestamps.sort(
    (left, right) => new Date(right).getTime() - new Date(left).getTime(),
  )[0];

  return {
    status,
    total: enabledTargets.length,
    available,
    responseTimeMs:
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          )
        : null,
    lastCheckedAt: lastCheckedAt ?? null,
  };
}

function getOverallStatus(
  asset: AssetResponse,
  alerts: AlertResponse[],
  telemetry: DashboardAssetOverview['telemetry'],
  healthChecks: DashboardAssetOverview['healthChecks'],
): { status: AssetOverallStatus; reason: string } {
  if (asset.status !== 'ACTIVATE') {
    return {
      status: 'INACTIVE',
      reason:
        asset.status === 'DEACTIVATE'
          ? 'Asset has been deactivated'
          : 'Asset is inactive',
    };
  }

  const criticalAlert = alerts.find((alert) => alert.severity === 'CRITICAL');

  if (criticalAlert) {
    return { status: 'CRITICAL', reason: criticalAlert.message };
  }

  const warningAlert = alerts.find((alert) => alert.severity === 'WARNING');

  if (warningAlert) {
    return { status: 'WARNING', reason: warningAlert.message };
  }

  if (isApplication(asset.targetType)) {
    if (healthChecks?.status === 'UNAVAILABLE') {
      return {
        status: 'WARNING',
        reason: 'One or more endpoints are unavailable',
      };
    }

    if (
      healthChecks?.status === 'STALE' ||
      healthChecks?.status === 'UNKNOWN'
    ) {
      return { status: 'NO_DATA', reason: 'Health check data is not current' };
    }

    if (
      healthChecks?.status === 'NOT_CONFIGURED' ||
      healthChecks?.status === 'PAUSED'
    ) {
      return { status: 'NOT_MONITORED', reason: 'No running health checks' };
    }
  } else {
    if (telemetry?.status === 'FAILED') {
      return {
        status: 'WARNING',
        reason: telemetry.lastError ?? 'Metrics collection is failing',
      };
    }

    if (telemetry?.status === 'STALE' || telemetry?.status === 'NO_DATA') {
      return { status: 'NO_DATA', reason: 'Telemetry data is not current' };
    }

    if (
      telemetry?.status === 'NOT_CONFIGURED' ||
      telemetry?.status === 'PAUSED'
    ) {
      return {
        status: 'NOT_MONITORED',
        reason: 'No running monitoring target',
      };
    }
  }

  return { status: 'OK', reason: 'All monitored signals are normal' };
}

function latestTimestamp(values: Array<string | null | undefined>): string {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  return new Date(
    Math.max(...timestamps.map((value) => value.getTime())),
  ).toISOString();
}

export function buildDashboardOverview(input: DashboardOverviewInput) {
  const now = input.now ?? new Date();
  const targetsByAsset = new Map<string, MonitoringTargetResponse[]>();
  const healthByAsset = new Map<string, HealthCheckTargetResponse[]>();
  const alertsByAsset = new Map<string, AlertResponse[]>();
  const metricsByAsset = new Map(
    input.metrics.map((summary) => [summary.assetId, summary]),
  );

  for (const target of input.monitoringTargets.filter(
    (item) => !item.archivedAt,
  )) {
    const targets = targetsByAsset.get(target.assetId) ?? [];
    targets.push(target);
    targetsByAsset.set(target.assetId, targets);
  }

  for (const target of input.healthCheckTargets.filter(
    (item) => !item.archivedAt,
  )) {
    const targets = healthByAsset.get(target.assetId) ?? [];
    targets.push(target);
    healthByAsset.set(target.assetId, targets);
  }

  for (const alert of input.alerts.filter(
    (item) => item.status === 'TRIGGERED' || item.status === 'ACKNOWLEDGED',
  )) {
    const alerts = alertsByAsset.get(alert.assetId) ?? [];
    alerts.push(alert);
    alertsByAsset.set(alert.assetId, alerts);
  }

  const assets: DashboardAssetOverview[] = input.assets.map((asset) => {
    const assetAlerts = (alertsByAsset.get(asset.assetId) ?? []).sort(
      (left, right) => {
        if (left.severity !== right.severity) {
          return left.severity === 'CRITICAL' ? -1 : 1;
        }

        return (
          new Date(right.triggeredAt).getTime() -
          new Date(left.triggeredAt).getTime()
        );
      },
    );
    const monitoringTarget = (targetsByAsset.get(asset.assetId) ?? []).find(
      (target) => target.monitoringType === 'NODE_EXPORTER',
    );
    const telemetry = isApplication(asset.targetType)
      ? null
      : getTelemetry(monitoringTarget, now);
    const healthChecks = isApplication(asset.targetType)
      ? getHealthChecks(healthByAsset.get(asset.assetId) ?? [], now)
      : null;
    const metricSummary = metricsByAsset.get(asset.assetId);
    const overall = getOverallStatus(
      asset,
      assetAlerts,
      telemetry,
      healthChecks,
    );

    return {
      assetId: asset.assetId,
      name: asset.name,
      targetType: asset.targetType,
      environment: asset.environment,
      address:
        asset.targetType === 'SERVER'
          ? (asset.ipAddress ?? asset.hostname)
          : asset.endpoint,
      lifecycleStatus: asset.status,
      overallStatus: overall.status,
      statusReason: overall.reason,
      telemetry,
      healthChecks,
      alerts: {
        active: assetAlerts.length,
        warning: assetAlerts.filter((alert) => alert.severity === 'WARNING')
          .length,
        critical: assetAlerts.filter((alert) => alert.severity === 'CRITICAL')
          .length,
      },
      metrics: isApplication(asset.targetType)
        ? null
        : {
            cpuUsagePercent: metricSummary?.cpuUsagePercent ?? null,
            memoryUsagePercent: metricSummary?.memoryUsagePercent ?? null,
            timestamp: metricSummary?.timestamp ?? null,
          },
      updatedAt: latestTimestamp([
        asset.updatedAt,
        telemetry?.lastCollectedAt,
        healthChecks?.lastCheckedAt,
        metricSummary?.timestamp,
        assetAlerts[0]?.triggeredAt,
      ]),
    };
  });

  const count = (status: AssetOverallStatus) =>
    assets.filter((asset) => asset.overallStatus === status).length;

  return {
    assets: {
      total: assets.length,
      ok: count('OK'),
      warning: count('WARNING'),
      critical: count('CRITICAL'),
      noData: count('NO_DATA'),
      notMonitored: count('NOT_MONITORED'),
      inactive: count('INACTIVE'),
    },
    alerts: {
      active: input.alerts.filter(
        (alert) =>
          alert.status === 'TRIGGERED' || alert.status === 'ACKNOWLEDGED',
      ).length,
    },
    assetOverview: assets,
  };
}

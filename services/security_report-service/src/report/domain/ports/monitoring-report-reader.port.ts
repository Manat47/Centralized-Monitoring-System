export interface MetricsReportSummary {
  assetId: string;

  cpu: {
    averageUsagePercent: number | null;
    minUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;
  };

  memory: {
    averageUsagePercent: number | null;
    minUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;
    averageUsedBytes: number | null;
    maxUsedBytes: number | null;
    totalBytes: number | null;
  };

  disks: Array<{
    device: string;
    mountpoint: string;
    filesystemType: string;
    totalBytes: number | null;
    latestUsagePercent: number | null;
    averageUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;
    latestUsedBytes: number | null;
    latestAvailableBytes: number | null;
    minAvailableBytes: number | null;
    usedChangeBytes: number | null;
  }>;

  networks: Array<{
    device: string;
    averageReceiveBytesPerSecond: number | null;
    maxReceiveBytesPerSecond: number | null;
    p95ReceiveBytesPerSecond: number | null;
    averageTransmitBytesPerSecond: number | null;
    maxTransmitBytesPerSecond: number | null;
    p95TransmitBytesPerSecond: number | null;
  }>;
}

export interface HealthReportSummary {
  healthCheckTargetId: string;

  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;

  failedHttpChecks: number;
  noResponseChecks: number;

  availabilityPercent: number | null;

  responseTime: {
    averageMs: number | null;
    maxMs: number | null;
    p95Ms: number | null;
  };

  statusCodes: Record<string, number>;
}

export interface HealthCheckTargetSnapshot {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  enabled: boolean;
  archivedAt: string | null;
}

export const MONITORING_REPORT_READER = Symbol('MONITORING_REPORT_READER');

export interface MonitoringReportReader {
  queryMetricsSummary(input: {
    assetId: string;
    start: Date;
    end: Date;
  }): Promise<MetricsReportSummary>;

  findHealthCheckTargets(): Promise<HealthCheckTargetSnapshot[]>;

  queryHealthSummary(input: {
    healthCheckTargetId: string;
    start: Date;
    end: Date;
  }): Promise<HealthReportSummary>;
}

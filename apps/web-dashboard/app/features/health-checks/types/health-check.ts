export interface HealthCheckTarget {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  enabled: boolean;
  archivedAt: string | null;
  lastCheckedAt: string | null;
  latest?: LatestHealthCheck | null;
  createdAt: string;
  updatedAt: string;
}

export interface LatestHealthCheck {
  timestamp: string;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

export type HealthCheckHistoryPoint = LatestHealthCheck;

export interface CreateHealthCheckTargetInput {
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
}

export interface UpdateHealthCheckTargetInput {
  checkIntervalSeconds: number;
}

export interface HealthCheckReportSummary {
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

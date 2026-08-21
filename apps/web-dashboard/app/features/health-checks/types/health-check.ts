export interface HealthCheckTarget {
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  enabled: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LatestHealthCheck {
  timestamp: string;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

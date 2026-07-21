export type VerificationStatus = "NOT_VERIFIED" | "VERIFIED" | "FAILED";

export interface MonitoringTarget {
  targetId: string;
  assetId: string;
  host: string;
  port: number;
  path: string;
  scrapeIntervalSeconds: number;
  verificationStatus: VerificationStatus;
  monitoringEnabled: boolean;

  lastVerifiedAt: string | null;
  lastCollectedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitoringTargetInput {
  assetId: string;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

export interface CollectMetricsResult {
  collected: number;
  skipped: number;
}

export interface ParsedMetric {
  name: string;
  labels: Record<string, string>;
  value: number;
  collectedAt: string;
}

export type CollectMetricsResponse = ParsedMetric[];

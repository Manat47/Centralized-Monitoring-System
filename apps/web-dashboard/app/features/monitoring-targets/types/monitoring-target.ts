export type VerificationStatus = "NOT_VERIFIED" | "VERIFIED" | "FAILED";
export type MonitoringType = "NODE_EXPORTER" | "PROMETHEUS_APPLICATION";
export type MonitoringProtocol = "HTTP" | "HTTPS";
export type MonitoringAddressSource = "HOSTNAME" | "IP_ADDRESS";

export interface MonitoringTarget {
  targetId: string;
  assetId: string;
  monitoringType: MonitoringType;
  protocol: MonitoringProtocol | null;
  addressSource: MonitoringAddressSource | null;
  port: number;
  path: string;
  scrapeIntervalSeconds: number;
  verificationStatus: VerificationStatus;
  verifiedConfigFingerprint: string | null;
  monitoringEnabled: boolean;
  archivedAt: string | null;

  lastVerifiedAt: string | null;
  lastCollectedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitoringTargetInput {
  assetId: string;
  addressSource?: MonitoringAddressSource;
  protocol?: MonitoringProtocol;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

export interface UpdateMonitoringTargetInput {
  addressSource: MonitoringAddressSource;
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

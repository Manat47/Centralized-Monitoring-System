import type {
  AssetEnvironment,
  AssetStatus,
  AssetTargetType,
} from "@/app/features/assets/types/asset";

export type AssetOverallStatus =
  | "OK"
  | "WARNING"
  | "CRITICAL"
  | "NO_DATA"
  | "NOT_MONITORED"
  | "INACTIVE";

export type TelemetryStatus =
  | "FRESH"
  | "STALE"
  | "FAILED"
  | "NO_DATA"
  | "PAUSED"
  | "NOT_CONFIGURED";

export type DashboardHealthStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "STALE"
  | "UNKNOWN"
  | "PAUSED"
  | "NOT_CONFIGURED";

export interface DashboardAssetOverview {
  assetId: string;
  name: string;
  targetType: AssetTargetType;
  environment: AssetEnvironment;
  address: string | null;
  lifecycleStatus: AssetStatus;
  overallStatus: AssetOverallStatus;
  statusReason: string;
  telemetry: {
    status: TelemetryStatus;
    lastCollectedAt: string | null;
    lastError: string | null;
  } | null;
  healthChecks: {
    status: DashboardHealthStatus;
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

export interface DashboardSummary {
  assets: {
    total: number;
    ok: number;
    warning: number;
    critical: number;
    noData: number;
    notMonitored: number;
    inactive: number;
  };
  alerts: {
    active: number;
  };
  assetOverview: DashboardAssetOverview[];
}

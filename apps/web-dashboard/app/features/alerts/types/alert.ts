export type AlertStatus = "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "CLOSED";

export type AlertSeverity = "WARNING" | "CRITICAL";

export type AlertSourceType = "METRIC_RULE" | "HEALTH_CHECK";

export type AlertType =
  | "METRIC_THRESHOLD"
  | "ENDPOINT_UNAVAILABLE"
  | "HEALTH_CHECK_STALE";

export type AlertResolutionReason =
  | "METRIC_RECOVERED"
  | "METRIC_RULE_UPDATED"
  | "METRIC_RULE_DISABLED"
  | "METRIC_RULE_ARCHIVED"
  | "MONITORING_TARGET_PAUSED"
  | "MONITORING_TARGET_ARCHIVED"
  | "HEALTH_CHECK_RECOVERED"
  | "HEALTH_CHECK_DATA_STALE"
  | "HEALTH_CHECK_DATA_RESUMED"
  | "HEALTH_CHECK_TARGET_PAUSED"
  | "HEALTH_CHECK_TARGET_ARCHIVED"
  | "ASSET_DEACTIVATED";

export interface AlertLifecycleEvent {
  lifecycleEventId: string;
  alertId: string;
  eventType: AlertStatus;
  actorUserId: string | null;
  reason: string | null;
  context: Record<string, unknown> | null;
  occurredAt: string;
}

export interface Alert {
  alertId: string;
  sourceType: AlertSourceType;
  sourceId: string;
  alertType: AlertType;
  dedupKey: string;
  ruleId: string | null;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  status: AlertStatus;
  thresholdValue: number | null;
  actualValue: number | null;
  actualText: string | null;
  context: Record<string, unknown> | null;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolutionReason: AlertResolutionReason | null;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertDetail extends Alert {
  lifecycle: AlertLifecycleEvent[];
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlertListParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  assetId?: string;
  sourceType?: AlertSourceType;
  alertType?: AlertType;
  search?: string;
  page?: number;
  limit?: number;
}

export type AlertStatus = "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "CLOSED";

export type AlertSeverity = "WARNING" | "CRITICAL";

export interface Alert {
  alertId: string;
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  status: AlertStatus;
  thresholdValue: number;
  actualValue: number | null;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  page?: number;
  limit?: number;
}

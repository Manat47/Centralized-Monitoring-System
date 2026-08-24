export type AuditActorRole = "ADMIN" | "OPERATOR";

export type AuditResult = "SUCCESS" | "FAILURE";

export type AuditResourceType =
  | "USER"
  | "ASSET"
  | "MONITORING_TARGET"
  | "METRIC_RULE"
  | "ALERT";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_STATUS_CHANGED"
  | "ASSET_CREATED"
  | "ASSET_UPDATED"
  | "ASSET_STATUS_CHANGED"
  | "ASSET_DEACTIVATED"
  | "MONITORING_TARGET_CREATED"
  | "MONITORING_TARGET_VERIFIED"
  | "MONITORING_TARGET_ENABLED"
  | "MONITORING_TARGET_DISABLED"
  | "METRIC_RULE_CREATED"
  | "ALERT_ACKNOWLEDGED"
  | "ALERT_CLOSED";

export interface AuditLog {
  auditLogId: string;
  actorUserId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  result: AuditResult;
  occurredAt: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogListParams {
  actorUserId?: string;
  actorRole?: AuditActorRole;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  result?: AuditResult;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

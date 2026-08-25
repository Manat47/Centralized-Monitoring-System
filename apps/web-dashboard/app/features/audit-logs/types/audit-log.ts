export type AuditActorRole = "ADMIN" | "OPERATOR";

export type AuditResult = "SUCCESS" | "FAILURE";

export type AuditResourceType =
  | "USER"
  | "ASSET"
  | "MONITORING_TARGET"
  | "METRIC_RULE"
  | "HEALTH_CHECK_TARGET"
  | "REPORT"
  | "NOTIFICATION_SETTINGS"
  | "ALERT";

export type AuditAction =
  | "USER_CREATED"
  | "USER_INVITED"
  | "USER_INVITATION_RESENT"
  | "USER_INVITATION_REVOKED"
  | "USER_INVITATION_ACCEPTED"
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
  | "HEALTH_CHECK_TARGET_CREATED"
  | "HEALTH_CHECK_TARGET_UPDATED"
  | "HEALTH_CHECK_TARGET_ENABLED"
  | "HEALTH_CHECK_TARGET_DISABLED"
  | "HEALTH_CHECK_TARGET_CHECKED"
  | "HEALTH_CHECK_TARGET_ARCHIVED"
  | "ALERT_ACKNOWLEDGED"
  | "ALERT_CLOSED"
  | "REPORT_GENERATED"
  | "NOTIFICATION_RECIPIENTS_UPDATED"
  | "NOTIFICATION_TEST_SENT";

export interface AuditLog {
  auditLogId: string;
  eventId: string;
  schemaVersion: number;
  actorUserId: string;
  actorRole: AuditActorRole;
  actorEmail: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  resourceName: string | null;
  result: AuditResult;
  sourceService: string;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  occurredAt: string;
  ingestedAt: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogListParams {
  search?: string;
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

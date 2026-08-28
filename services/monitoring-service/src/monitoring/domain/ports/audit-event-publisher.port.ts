export type UserRole = 'ADMIN' | 'OPERATOR';

export type AuditAction =
  | 'MONITORING_TARGET_CREATED'
  | 'MONITORING_TARGET_VERIFIED'
  | 'MONITORING_TARGET_ENABLED'
  | 'MONITORING_TARGET_DISABLED'
  | 'MONITORING_TARGET_ARCHIVED'
  | 'METRIC_RULE_CREATED'
  | 'METRIC_RULE_UPDATED'
  | 'METRIC_RULE_ENABLED'
  | 'METRIC_RULE_DISABLED'
  | 'METRIC_RULE_ARCHIVED'
  | 'HEALTH_CHECK_TARGET_CREATED'
  | 'HEALTH_CHECK_TARGET_UPDATED'
  | 'HEALTH_CHECK_TARGET_ENABLED'
  | 'HEALTH_CHECK_TARGET_DISABLED'
  | 'HEALTH_CHECK_TARGET_CHECKED'
  | 'HEALTH_CHECK_TARGET_ARCHIVED';

export type AuditResourceType =
  | 'MONITORING_TARGET'
  | 'METRIC_RULE'
  | 'HEALTH_CHECK_TARGET';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;

  action: AuditAction;

  resourceType: AuditResourceType;
  resourceId?: string | null;
  resourceName?: string | null;

  result: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;

  occurredAt: Date;
}

export const AUDIT_EVENT_PUBLISHER = Symbol('AUDIT_EVENT_PUBLISHER');

export interface AuditEventPublisher {
  publish(event: AuditEvent): Promise<void>;
}

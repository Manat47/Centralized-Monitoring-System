export type UserRole = 'ADMIN' | 'OPERATOR';

export type AuditAction =
  | 'MONITORING_TARGET_CREATED'
  | 'MONITORING_TARGET_VERIFIED'
  | 'MONITORING_TARGET_ENABLED'
  | 'MONITORING_TARGET_DISABLED'
  | 'METRIC_RULE_CREATED'
  | 'HEALTH_CHECK_TARGET_CREATED'
  | 'HEALTH_CHECK_TARGET_ENABLED'
  | 'HEALTH_CHECK_TARGET_DISABLED';

export type AuditResourceType =
  | 'MONITORING_TARGET'
  | 'METRIC_RULE'
  | 'HEALTH_CHECK_TARGET';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;

  action: AuditAction;

  resourceType: AuditResourceType;
  resourceId: string;

  result: 'SUCCESS' | 'FAILURE';

  occurredAt: Date;
}

export const AUDIT_EVENT_PUBLISHER = Symbol('AUDIT_EVENT_PUBLISHER');

export interface AuditEventPublisher {
  publish(event: AuditEvent): Promise<void>;
}

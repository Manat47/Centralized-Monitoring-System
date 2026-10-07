export type UserRole = 'ADMIN' | 'OPERATOR';

export type AuditAction =
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_CLOSED'
  | 'LOG_FINDING_RULE_CREATED'
  | 'LOG_FINDING_RULE_UPDATED'
  | 'LOG_FINDING_RULE_DELETED';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;

  action: AuditAction;

  resourceType: 'ALERT' | 'LOG_FINDING_RULE';
  resourceId: string;
  resourceName?: string | null;

  result: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown> | null;

  occurredAt: Date;
}

export const AUDIT_EVENT_PUBLISHER = Symbol('AUDIT_EVENT_PUBLISHER');

export interface AuditEventPublisher {
  publish(event: AuditEvent): Promise<void>;
}

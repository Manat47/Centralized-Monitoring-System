export type UserRole = 'ADMIN' | 'OPERATOR';

export type AuditAction = 'ALERT_ACKNOWLEDGED' | 'ALERT_CLOSED';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;

  action: AuditAction;

  resourceType: 'ALERT';
  resourceId: string;

  result: 'SUCCESS' | 'FAILURE';

  occurredAt: Date;
}

export const AUDIT_EVENT_PUBLISHER = Symbol('AUDIT_EVENT_PUBLISHER');

export interface AuditEventPublisher {
  publish(event: AuditEvent): Promise<void>;
}

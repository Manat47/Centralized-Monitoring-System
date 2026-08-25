export interface AuditEvent {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
  action:
    | 'NOTIFICATION_RECIPIENTS_UPDATED'
    | 'NOTIFICATION_TEST_SENT';
  resourceType: 'NOTIFICATION_SETTINGS';
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

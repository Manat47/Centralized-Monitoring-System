import type { UserRole } from '../entities/user.entity';

export type AuditAction =
  'USER_CREATED' | 'USER_UPDATED' | 'USER_STATUS_CHANGED';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;

  action: AuditAction;

  resourceType: 'USER';
  resourceId: string;

  result: 'SUCCESS' | 'FAILURE';

  occurredAt: Date;
}

export const AUDIT_EVENT_PUBLISHER = Symbol('AUDIT_EVENT_PUBLISHER');

export interface AuditEventPublisher {
  publish(event: AuditEvent): Promise<void>;
}

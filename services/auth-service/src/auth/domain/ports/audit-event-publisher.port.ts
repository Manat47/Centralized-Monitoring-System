import type { UserRole } from '../entities/user.entity';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_INVITED'
  | 'USER_INVITATION_RESENT'
  | 'USER_INVITATION_REVOKED'
  | 'USER_INVITATION_ACCEPTED'
  | 'USER_UPDATED'
  | 'USER_STATUS_CHANGED';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;

  action: AuditAction;

  resourceType: 'USER';
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

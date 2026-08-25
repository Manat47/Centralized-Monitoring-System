export type UserRole = 'ADMIN' | 'OPERATOR';

export type AuditAction =
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_STATUS_CHANGED'
  | 'ASSET_DEACTIVATED';

export interface AuditEvent {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;

  action: AuditAction;

  resourceType: 'ASSET';
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

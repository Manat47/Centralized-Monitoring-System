import type {
  AuditAction,
  AuditActorRole,
  AuditResourceType,
  AuditResult,
} from '../../../domain/entities/audit-log.entity';

export interface AuditEvent {
  actorUserId: string;
  actorRole: AuditActorRole;

  action: AuditAction;

  resourceType: AuditResourceType;
  resourceId: string;

  result: AuditResult;

  occurredAt: string;
}

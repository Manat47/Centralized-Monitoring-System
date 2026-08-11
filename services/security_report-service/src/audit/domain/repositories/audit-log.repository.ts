import type {
  AuditAction,
  AuditActorRole,
  AuditLog,
  AuditResourceType,
  AuditResult,
} from '../entities/audit-log.entity';

export interface FindAuditLogsInput {
  actorUserId?: string;
  actorRole?: AuditActorRole;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface FindAuditLogsResult {
  items: AuditLog[];
  total: number;
}

export interface AuditLogRepository {
  create(auditLog: AuditLog): Promise<void>;

  findMany(input: FindAuditLogsInput): Promise<FindAuditLogsResult>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

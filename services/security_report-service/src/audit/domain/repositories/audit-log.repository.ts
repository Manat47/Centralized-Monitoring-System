import type { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogRepository {
  create(auditLog: AuditLog): Promise<void>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

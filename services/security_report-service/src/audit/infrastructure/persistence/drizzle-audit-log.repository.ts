import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { auditLogs } from '../../../database/schema/audit_log.schema';
import * as schema from '../../../database/schema/database.schema';

import type { AuditLog } from '../../domain/entities/audit-log.entity';
import type { AuditLogRepository } from '../../domain/repositories/audit-log.repository';

@Injectable()
export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(auditLog: AuditLog): Promise<void> {
    const data = auditLog.toObject();

    await this.db.insert(auditLogs).values({
      auditLogId: data.auditLogId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      result: data.result,
      occurredAt: data.occurredAt,
    });
  }
}

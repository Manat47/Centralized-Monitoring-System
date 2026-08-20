import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../../../database/database.provider';
import { auditLogs } from '../../../database/schema/audit_log.schema';
import * as schema from '../../../database/schema/database.schema';
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';

import {
  AuditLog,
  type AuditAction,
  type AuditActorRole,
  type AuditResourceType,
  type AuditResult,
} from '../../domain/entities/audit-log.entity';
import {
  type AuditLogRepository,
  type FindAuditLogsInput,
  type FindAuditLogsResult,
  type FindAuditLogsForReportInput,
} from '../../domain/repositories/audit-log.repository';

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

  async findMany(input: FindAuditLogsInput): Promise<FindAuditLogsResult> {
    const conditions: SQL[] = [];

    if (input.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, input.actorUserId));
    }

    if (input.actorRole) {
      conditions.push(eq(auditLogs.actorRole, input.actorRole));
    }

    if (input.action) {
      conditions.push(eq(auditLogs.action, input.action));
    }

    if (input.resourceType) {
      conditions.push(eq(auditLogs.resourceType, input.resourceType));
    }

    if (input.result) {
      conditions.push(eq(auditLogs.result, input.result));
    }

    if (input.from) {
      conditions.push(gte(auditLogs.occurredAt, input.from));
    }

    if (input.to) {
      conditions.push(lte(auditLogs.occurredAt, input.to));
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (input.page - 1) * input.limit;

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(whereCondition)
      .orderBy(desc(auditLogs.occurredAt))
      .limit(input.limit)
      .offset(offset);

    const [countRow] = await this.db
      .select({
        value: count(),
      })
      .from(auditLogs)
      .where(whereCondition);

    const items = rows.map((row) =>
      AuditLog.restore({
        auditLogId: row.auditLogId,
        actorUserId: row.actorUserId,
        actorRole: row.actorRole as AuditActorRole,
        action: row.action as AuditAction,
        resourceType: row.resourceType as AuditResourceType,
        resourceId: row.resourceId,
        result: row.result as AuditResult,
        occurredAt: row.occurredAt,
      }),
    );

    return {
      items,
      total: countRow.value,
    };
  }

  async findForReport(input: FindAuditLogsForReportInput): Promise<AuditLog[]> {
    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.occurredAt, input.from),
          lte(auditLogs.occurredAt, input.to),
        ),
      )
      .orderBy(desc(auditLogs.occurredAt));

    return rows.map((row) =>
      AuditLog.restore({
        auditLogId: row.auditLogId,
        actorUserId: row.actorUserId,
        actorRole: row.actorRole as AuditActorRole,
        action: row.action as AuditAction,
        resourceType: row.resourceType as AuditResourceType,
        resourceId: row.resourceId,
        result: row.result as AuditResult,
        occurredAt: row.occurredAt,
      }),
    );
  }
}

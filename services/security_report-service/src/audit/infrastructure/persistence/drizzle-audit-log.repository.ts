import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../../../database/database.provider';
import { auditLogs } from '../../../database/schema/audit_log.schema';
import * as schema from '../../../database/schema/database.schema';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

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
      eventId: data.eventId,
      schemaVersion: data.schemaVersion,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      actorEmail: data.actorEmail,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      result: data.result,
      sourceService: data.sourceService,
      requestId: data.requestId,
      metadata: data.metadata,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      occurredAt: data.occurredAt,
      ingestedAt: data.ingestedAt,
    }).onConflictDoNothing({ target: auditLogs.eventId });
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

    if (input.search) {
      const pattern = `%${input.search}%`;
      conditions.push(
        or(
          ilike(auditLogs.actorEmail, pattern),
          ilike(auditLogs.action, pattern),
          ilike(auditLogs.resourceType, pattern),
          ilike(auditLogs.resourceName, pattern),
          ilike(auditLogs.sourceService, pattern),
          sql`${auditLogs.actorUserId}::text ILIKE ${pattern}`,
          sql`${auditLogs.resourceId}::text ILIKE ${pattern}`,
        )!,
      );
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

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(whereCondition)
        .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.auditLogId))
        .limit(input.limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(auditLogs)
        .where(whereCondition),
    ]);
    const [countRow] = countRows;

    const items = rows.map((row) =>
      AuditLog.restore({
        auditLogId: row.auditLogId,
        eventId: row.eventId,
        schemaVersion: row.schemaVersion,
        actorUserId: row.actorUserId,
        actorRole: row.actorRole as AuditActorRole,
        actorEmail: row.actorEmail,
        action: row.action as AuditAction,
        resourceType: row.resourceType as AuditResourceType,
        resourceId: row.resourceId,
        resourceName: row.resourceName,
        result: row.result as AuditResult,
        sourceService: row.sourceService,
        requestId: row.requestId,
        metadata: row.metadata,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        occurredAt: row.occurredAt,
        ingestedAt: row.ingestedAt,
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
        eventId: row.eventId,
        schemaVersion: row.schemaVersion,
        actorUserId: row.actorUserId,
        actorRole: row.actorRole as AuditActorRole,
        actorEmail: row.actorEmail,
        action: row.action as AuditAction,
        resourceType: row.resourceType as AuditResourceType,
        resourceId: row.resourceId,
        resourceName: row.resourceName,
        result: row.result as AuditResult,
        sourceService: row.sourceService,
        requestId: row.requestId,
        metadata: row.metadata,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        occurredAt: row.occurredAt,
        ingestedAt: row.ingestedAt,
      }),
    );
  }
}

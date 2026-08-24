import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  Alert,
  type AlertSourceType,
  type AlertType,
  type AlertResolutionReason,
} from '../../domain/entities/alert.entity';
import type { AlertLifecycleEvent } from '../../domain/entities/alert-lifecycle-event';
import {
  type AlertRepository,
  type FindAlertsFilters,
  type FindAlertsForReportFilters,
  type FindAlertsResult,
} from '../../domain/repositories/alert.repository';
import { DRIZZLE_DB } from '../../../database/database.provider';
import {
  alertLifecycleEvents,
  alerts,
  processedAlertEvents,
  type AlertLifecycleEventRow,
  type AlertRow,
} from '../../../database/schema/alerts.schema';
import * as schema from '../../../database/schema/alerts.schema';

@Injectable()
export class DrizzleAlertRepository implements AlertRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(alert: Alert): Promise<Alert> {
    const data = alert.toObject();

    const [created] = await this.db
      .insert(alerts)
      .values({
        alertId: data.alertId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        alertType: data.alertType,
        dedupKey: data.dedupKey,
        ruleId: data.ruleId,
        assetId: data.assetId,
        metricType: data.metricType,
        severity: data.severity,
        status: data.status,
        thresholdValue: data.thresholdValue,
        actualValue: data.actualValue,
        actualText: data.actualText,
        context: data.context,
        message: data.message,
        triggeredAt: data.triggeredAt,
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
        resolvedAt: data.resolvedAt,
        resolutionReason: data.resolutionReason,
        closedAt: data.closedAt,
        closedBy: data.closedBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    return this.toDomain(created);
  }

  async findActiveByRuleId(ruleId: string): Promise<Alert | null> {
    const [row] = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.ruleId, ruleId),
          inArray(alerts.status, ['TRIGGERED', 'ACKNOWLEDGED']),
        ),
      )
      .orderBy(desc(alerts.triggeredAt))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findActiveByDedupKey(dedupKey: string): Promise<Alert | null> {
    const [row] = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.dedupKey, dedupKey),
          inArray(alerts.status, ['TRIGGERED', 'ACKNOWLEDGED']),
        ),
      )
      .orderBy(desc(alerts.triggeredAt))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findActiveBySource(
    sourceType: string,
    sourceId: string,
  ): Promise<Alert[]> {
    const rows = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.sourceType, sourceType),
          eq(alerts.sourceId, sourceId),
          inArray(alerts.status, ['TRIGGERED', 'ACKNOWLEDGED']),
        ),
      )
      .orderBy(desc(alerts.triggeredAt));

    return rows.map((row) => this.toDomain(row));
  }

  async findActiveByAssetId(assetId: string): Promise<Alert[]> {
    const rows = await this.db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.assetId, assetId),
          inArray(alerts.status, ['TRIGGERED', 'ACKNOWLEDGED']),
        ),
      )
      .orderBy(desc(alerts.triggeredAt));

    return rows.map((row) => this.toDomain(row));
  }

  async findAll(filters?: FindAlertsFilters): Promise<FindAlertsResult> {
    const conditions: SQL[] = [];

    if (filters?.status) {
      conditions.push(eq(alerts.status, filters.status));
    }

    if (filters?.severity) {
      conditions.push(eq(alerts.severity, filters.severity));
    }

    if (filters?.assetId) {
      conditions.push(eq(alerts.assetId, filters.assetId));
    }

    if (filters?.sourceType) {
      conditions.push(eq(alerts.sourceType, filters.sourceType));
    }

    if (filters?.alertType) {
      conditions.push(eq(alerts.alertType, filters.alertType));
    }

    if (filters?.search?.trim()) {
      const pattern = `%${filters.search.trim()}%`;
      const searchCondition = or(
        ilike(alerts.metricType, pattern),
        ilike(alerts.message, pattern),
        ilike(alerts.actualText, pattern),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (filters?.from) {
      conditions.push(gte(alerts.triggeredAt, filters.from));
    }

    if (filters?.to) {
      conditions.push(lte(alerts.triggeredAt, filters.to));
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(alerts)
        .where(whereCondition)
        .orderBy(desc(alerts.triggeredAt))
        .limit(limit)
        .offset(offset),

      this.db.select({ total: count() }).from(alerts).where(whereCondition),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total: totalRows[0]?.total ?? 0,
    };
  }

  async findForReport(filters: FindAlertsForReportFilters): Promise<Alert[]> {
    const conditions: SQL[] = [
      gte(alerts.triggeredAt, filters.from),
      lte(alerts.triggeredAt, filters.to),
    ];

    if (filters.assetId) {
      conditions.push(eq(alerts.assetId, filters.assetId));
    }

    const rows = await this.db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(alerts.triggeredAt);

    return rows.map((row) => this.toDomain(row));
  }

  async findById(alertId: string): Promise<Alert | null> {
    const [row] = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.alertId, alertId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async update(alert: Alert): Promise<Alert> {
    const data = alert.toObject();

    const [updated] = await this.db
      .update(alerts)
      .set({
        status: data.status,
        acknowledgedAt: data.acknowledgedAt,
        actualValue: data.actualValue,
        actualText: data.actualText,
        context: data.context,
        message: data.message,
        resolvedAt: data.resolvedAt,
        resolutionReason: data.resolutionReason,
        acknowledgedBy: data.acknowledgedBy,
        closedAt: data.closedAt,
        closedBy: data.closedBy,
        updatedAt: data.updatedAt,
      })
      .where(eq(alerts.alertId, data.alertId))
      .returning();

    if (!updated) {
      throw new Error(`Alert ${data.alertId} not found`);
    }

    return this.toDomain(updated);
  }

  async appendLifecycleEvent(event: AlertLifecycleEvent): Promise<void> {
    await this.db.insert(alertLifecycleEvents).values(event);
  }

  async findLifecycleEvents(alertId: string): Promise<AlertLifecycleEvent[]> {
    const rows = await this.db
      .select()
      .from(alertLifecycleEvents)
      .where(eq(alertLifecycleEvents.alertId, alertId))
      .orderBy(alertLifecycleEvents.occurredAt);

    return rows.map((row) => this.toLifecycleEvent(row));
  }

  async claimEvent(eventId: string): Promise<boolean> {
    const inserted = await this.db
      .insert(processedAlertEvents)
      .values({ eventId })
      .onConflictDoNothing()
      .returning({ eventId: processedAlertEvents.eventId });

    return inserted.length === 1;
  }

  async releaseEvent(eventId: string): Promise<void> {
    await this.db
      .delete(processedAlertEvents)
      .where(eq(processedAlertEvents.eventId, eventId));
  }

  private toDomain(row: AlertRow): Alert {
    return Alert.restore({
      alertId: row.alertId,
      sourceType: row.sourceType as AlertSourceType,
      sourceId: row.sourceId,
      alertType: row.alertType as AlertType,
      dedupKey: row.dedupKey,
      ruleId: row.ruleId,
      assetId: row.assetId,
      metricType: row.metricType,
      severity: row.severity,
      status: row.status,
      thresholdValue: row.thresholdValue,
      actualValue: row.actualValue,
      actualText: row.actualText,
      context: row.context,
      message: row.message,
      triggeredAt: row.triggeredAt,
      acknowledgedAt: row.acknowledgedAt,
      acknowledgedBy: row.acknowledgedBy,
      resolvedAt: row.resolvedAt,
      resolutionReason: row.resolutionReason as AlertResolutionReason | null,
      closedAt: row.closedAt,
      closedBy: row.closedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toLifecycleEvent(row: AlertLifecycleEventRow): AlertLifecycleEvent {
    return {
      lifecycleEventId: row.lifecycleEventId,
      alertId: row.alertId,
      eventType: row.eventType as AlertLifecycleEvent['eventType'],
      actorUserId: row.actorUserId,
      reason: row.reason,
      context: row.context,
      occurredAt: row.occurredAt,
    };
  }
}

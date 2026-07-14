import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { Alert } from '../../domain/entities/alert.entity';
import {
  AlertRepository,
  type FindAlertsFilters,
} from '../../domain/repositories/alert.repository';
import { DRIZZLE_DB } from '../../../database/database.provider';
import { alerts, type AlertRow } from '../../../database/schema/alerts.schema';
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
        ruleId: data.ruleId,
        assetId: data.assetId,
        metricType: data.metricType,
        severity: data.severity,
        status: data.status,
        thresholdValue: data.thresholdValue,
        actualValue: data.actualValue,
        message: data.message,
        triggeredAt: data.triggeredAt,
        acknowledgedAt: data.acknowledgedAt,
        resolvedAt: data.resolvedAt,
        closedAt: data.closedAt,
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

  async findAll(filters?: FindAlertsFilters): Promise<Alert[]> {
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

    const rows = await this.db
      .select()
      .from(alerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alerts.triggeredAt));

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
        message: data.message,
        resolvedAt: data.resolvedAt,
        closedAt: data.closedAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(alerts.alertId, data.alertId))
      .returning();

    if (!updated) {
      throw new Error(`Alert ${data.alertId} not found`);
    }

    return this.toDomain(updated);
  }

  private toDomain(row: AlertRow): Alert {
    return Alert.restore({
      alertId: row.alertId,
      ruleId: row.ruleId,
      assetId: row.assetId,
      metricType: row.metricType,
      severity: row.severity,
      status: row.status,
      thresholdValue: row.thresholdValue,
      actualValue: row.actualValue,
      message: row.message,
      triggeredAt: row.triggeredAt,
      acknowledgedAt: row.acknowledgedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

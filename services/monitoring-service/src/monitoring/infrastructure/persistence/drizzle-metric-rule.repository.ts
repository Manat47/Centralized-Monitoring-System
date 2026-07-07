import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/monitoring-targets.schema';
import { MetricRule } from '../../domain/entities/metric-rule.entity';
import type { MetricRuleRepository } from '../../domain/repositories/metric-rule.repository';
import {
  MetricRuleOperator,
  MetricRuleSeverity,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';

type MetricRuleRow = typeof schema.metricRules.$inferSelect;

@Injectable()
export class DrizzleMetricRuleRepository implements MetricRuleRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(rule: MetricRule): Promise<MetricRule> {
    const data = rule.toObject();

    const [row] = await this.db
      .insert(schema.metricRules)
      .values({
        ruleId: data.ruleId,
        assetId: data.assetId,
        metricType: data.metricType,
        operator: data.operator,
        thresholdValue: data.thresholdValue,
        durationSeconds: data.durationSeconds,
        severity: data.severity,
        enabled: data.enabled,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create metric rule');
    }

    return this.toDomain(row);
  }

  async findAll(): Promise<MetricRule[]> {
    const rows = await this.db.select().from(schema.metricRules);

    return rows.map((row) => this.toDomain(row));
  }

  async findEnabled(): Promise<MetricRule[]> {
    const rows = await this.db
      .select()
      .from(schema.metricRules)
      .where(eq(schema.metricRules.enabled, true));

    return rows.map((row) => this.toDomain(row));
  }

  async findByAssetId(assetId: string): Promise<MetricRule[]> {
    const rows = await this.db
      .select()
      .from(schema.metricRules)
      .where(eq(schema.metricRules.assetId, assetId));

    return rows.map((row) => this.toDomain(row));
  }

  async findById(ruleId: string): Promise<MetricRule | null> {
    const [row] = await this.db
      .select()
      .from(schema.metricRules)
      .where(eq(schema.metricRules.ruleId, ruleId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async update(rule: MetricRule): Promise<MetricRule> {
    const data = rule.toObject();

    const [row] = await this.db
      .update(schema.metricRules)
      .set({
        metricType: data.metricType,
        operator: data.operator,
        thresholdValue: data.thresholdValue,
        durationSeconds: data.durationSeconds,
        severity: data.severity,
        enabled: data.enabled,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.metricRules.ruleId, data.ruleId))
      .returning();

    if (!row) {
      throw new Error(`Metric rule ${data.ruleId} not found`);
    }

    return this.toDomain(row);
  }

  private toDomain(row: MetricRuleRow): MetricRule {
    return MetricRule.restore({
      ruleId: row.ruleId,
      assetId: row.assetId,
      metricType: this.toMetricRuleType(row.metricType),
      operator: this.toMetricRuleOperator(row.operator),
      thresholdValue: row.thresholdValue,
      durationSeconds: row.durationSeconds,
      severity: this.toMetricRuleSeverity(row.severity),
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  private toMetricRuleType(value: MetricRuleRow['metricType']): MetricRuleType {
    switch (value) {
      case 'CPU_USAGE':
        return MetricRuleType.CPU_USAGE;
      case 'MEMORY_USAGE':
        return MetricRuleType.MEMORY_USAGE;
      case 'DISK_USAGE':
        return MetricRuleType.DISK_USAGE;
    }
  }

  private toMetricRuleOperator(
    value: MetricRuleRow['operator'],
  ): MetricRuleOperator {
    switch (value) {
      case 'GREATER_THAN':
        return MetricRuleOperator.GREATER_THAN;
      case 'GREATER_THAN_OR_EQUAL':
        return MetricRuleOperator.GREATER_THAN_OR_EQUAL;
    }
  }

  private toMetricRuleSeverity(
    value: MetricRuleRow['severity'],
  ): MetricRuleSeverity {
    switch (value) {
      case 'WARNING':
        return MetricRuleSeverity.WARNING;
      case 'CRITICAL':
        return MetricRuleSeverity.CRITICAL;
    }
  }
}

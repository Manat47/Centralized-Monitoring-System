import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/monitoring-targets.schema';
import { MetricRule } from '../../domain/entities/metric-rule.entity';
import type {
  MetricRuleListItem,
  MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import { MetricRuleEvaluationState } from '../../domain/entities/metric-rule-evaluation-state.entity';
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
        archivedAt: data.archivedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create metric rule');
    }

    return this.toDomain(row);
  }

  async findAll(includeArchived = false): Promise<MetricRuleListItem[]> {
    const rows = await this.db
      .select({
        rule: schema.metricRules,
        evaluation: schema.metricRuleEvaluationStates,
      })
      .from(schema.metricRules)
      .leftJoin(
        schema.metricRuleEvaluationStates,
        eq(schema.metricRuleEvaluationStates.ruleId, schema.metricRules.ruleId),
      )
      .where(
        includeArchived ? undefined : isNull(schema.metricRules.archivedAt),
      );

    return rows.map((row) => ({
      rule: this.toDomain(row.rule).toObject(),
      evaluation: row.evaluation
        ? MetricRuleEvaluationState.restore(row.evaluation).toObject()
        : null,
    }));
  }

  async findEnabled(): Promise<MetricRule[]> {
    const rows = await this.db
      .select()
      .from(schema.metricRules)
      .where(
        and(
          eq(schema.metricRules.enabled, true),
          isNull(schema.metricRules.archivedAt),
        ),
      );

    return rows.map((row) => this.toDomain(row));
  }

  async findByAssetId(
    assetId: string,
    includeArchived = false,
  ): Promise<MetricRuleListItem[]> {
    const rows = await this.db
      .select({
        rule: schema.metricRules,
        evaluation: schema.metricRuleEvaluationStates,
      })
      .from(schema.metricRules)
      .leftJoin(
        schema.metricRuleEvaluationStates,
        eq(schema.metricRuleEvaluationStates.ruleId, schema.metricRules.ruleId),
      )
      .where(
        includeArchived
          ? eq(schema.metricRules.assetId, assetId)
          : and(
              eq(schema.metricRules.assetId, assetId),
              isNull(schema.metricRules.archivedAt),
            ),
      );

    return rows.map((row) => ({
      rule: this.toDomain(row.rule).toObject(),
      evaluation: row.evaluation
        ? MetricRuleEvaluationState.restore(row.evaluation).toObject()
        : null,
    }));
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
        archivedAt: data.archivedAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.metricRules.ruleId, data.ruleId))
      .returning();

    if (!row) {
      throw new Error(`Metric rule ${data.ruleId} not found`);
    }

    return this.toDomain(row);
  }

  async findDuplicate(
    rule: MetricRule,
    excludeRuleId?: string,
  ): Promise<MetricRule | null> {
    const data = rule.toObject();
    const conditions = [
      eq(schema.metricRules.assetId, data.assetId),
      eq(schema.metricRules.metricType, data.metricType),
      eq(schema.metricRules.operator, data.operator),
      eq(schema.metricRules.thresholdValue, data.thresholdValue),
      eq(schema.metricRules.durationSeconds, data.durationSeconds),
      eq(schema.metricRules.severity, data.severity),
      isNull(schema.metricRules.archivedAt),
    ];

    if (excludeRuleId) {
      conditions.push(ne(schema.metricRules.ruleId, excludeRuleId));
    }

    const [row] = await this.db
      .select()
      .from(schema.metricRules)
      .where(and(...conditions))
      .limit(1);

    return row ? this.toDomain(row) : null;
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
      archivedAt: row.archivedAt,
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

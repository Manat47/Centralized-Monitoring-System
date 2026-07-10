import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/monitoring-targets.schema';
import { MetricRuleEvaluationState } from '../../domain/entities/metric-rule-evaluation-state.entity';
import type { MetricRuleEvaluationStateRepository } from '../../domain/repositories/metric-rule-evaluation-state.repository';

type MetricRuleEvaluationStateRow =
  typeof schema.metricRuleEvaluationStates.$inferSelect;

@Injectable()
export class DrizzleMetricRuleEvaluationStateRepository implements MetricRuleEvaluationStateRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(
    state: MetricRuleEvaluationState,
  ): Promise<MetricRuleEvaluationState> {
    const data = state.toObject();

    const [row] = await this.db
      .insert(schema.metricRuleEvaluationStates)
      .values({
        stateId: data.stateId,
        ruleId: data.ruleId,
        assetId: data.assetId,
        status: data.status,
        violatedSince: data.violatedSince,
        lastEvaluatedAt: data.lastEvaluatedAt,
        lastActualValue: data.lastActualValue,
        lastTriggeredAt: data.lastTriggeredAt,
        recoveredAt: data.recoveredAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create metric rule evaluation state');
    }

    return this.toDomain(row);
  }

  async findByRuleId(
    ruleId: string,
  ): Promise<MetricRuleEvaluationState | null> {
    const [row] = await this.db
      .select()
      .from(schema.metricRuleEvaluationStates)
      .where(eq(schema.metricRuleEvaluationStates.ruleId, ruleId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async update(
    state: MetricRuleEvaluationState,
  ): Promise<MetricRuleEvaluationState> {
    const data = state.toObject();

    const [row] = await this.db
      .update(schema.metricRuleEvaluationStates)
      .set({
        status: data.status,
        violatedSince: data.violatedSince,
        lastEvaluatedAt: data.lastEvaluatedAt,
        lastActualValue: data.lastActualValue,
        lastTriggeredAt: data.lastTriggeredAt,
        recoveredAt: data.recoveredAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.metricRuleEvaluationStates.stateId, data.stateId))
      .returning();

    if (!row) {
      throw new Error(`Metric rule evaluation state ${data.stateId} not found`);
    }

    return this.toDomain(row);
  }

  private toDomain(
    row: MetricRuleEvaluationStateRow,
  ): MetricRuleEvaluationState {
    return MetricRuleEvaluationState.restore({
      stateId: row.stateId,
      ruleId: row.ruleId,
      assetId: row.assetId,
      status: row.status,
      violatedSince: row.violatedSince,
      lastEvaluatedAt: row.lastEvaluatedAt,
      lastActualValue: row.lastActualValue,
      lastTriggeredAt: row.lastTriggeredAt,
      recoveredAt: row.recoveredAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

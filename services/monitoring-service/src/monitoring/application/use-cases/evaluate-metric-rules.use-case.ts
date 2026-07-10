import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MetricRule,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';
import { MetricRuleEvaluationState } from '../../domain/entities/metric-rule-evaluation-state.entity';
import {
  METRIC_RULE_EVALUATION_STATE_REPOSITORY,
  type MetricRuleEvaluationStateRepository,
} from '../../domain/repositories/metric-rule-evaluation-state.repository';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import { QueryMetricsSummaryUseCase } from './query-metrics-summary.use-case';

export interface MetricRuleViolation {
  ruleId: string;
  assetId: string;
  metricType: MetricRuleType;
  severity: 'WARNING' | 'CRITICAL';
  thresholdValue: number;
  actualValue: number;
  message: string;
  evaluatedAt: Date;
}

export interface EvaluateMetricRulesResult {
  checked: number;
  triggered: number;
  recovered: number;
  events: MetricRuleViolation[];
}

@Injectable()
export class EvaluateMetricRulesUseCase {
  private readonly logger = new Logger(EvaluateMetricRulesUseCase.name);

  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,

    @Inject(METRIC_RULE_EVALUATION_STATE_REPOSITORY)
    private readonly stateRepository: MetricRuleEvaluationStateRepository,

    private readonly queryMetricsSummaryUseCase: QueryMetricsSummaryUseCase,
  ) {}

  async execute(): Promise<EvaluateMetricRulesResult> {
    const rules = await this.metricRuleRepository.findEnabled();

    const result: EvaluateMetricRulesResult = {
      checked: rules.length,
      triggered: 0,
      recovered: 0,
      events: [],
    };

    const now = new Date();

    for (const rule of rules) {
      try {
        const ruleResult = await this.evaluateSingleRule(rule, now);

        if (ruleResult.triggeredEvent) {
          result.triggered += 1;
          result.events.push(ruleResult.triggeredEvent);

          this.logger.warn(ruleResult.triggeredEvent.message);
        }

        if (ruleResult.recovered) {
          result.recovered += 1;
        }
      } catch (error) {
        const data = rule.toObject();

        const message =
          error instanceof Error ? error.message : 'Unknown evaluation error';

        this.logger.error(`Failed to evaluate rule ${data.ruleId}: ${message}`);
      }
    }

    return result;
  }

  private async evaluateSingleRule(
    rule: MetricRule,
    now: Date,
  ): Promise<{
    triggeredEvent: MetricRuleViolation | null;
    recovered: boolean;
  }> {
    const data = rule.toObject();

    let state = await this.stateRepository.findByRuleId(data.ruleId);

    if (!state) {
      state = MetricRuleEvaluationState.create(randomUUID(), {
        ruleId: data.ruleId,
        assetId: data.assetId,
      });

      state = await this.stateRepository.create(state);
    }

    const previousStatus = state.toObject().status;

    const end = now;

    const start = new Date(
      end.getTime() - Math.max(data.durationSeconds, 60) * 1000,
    );

    const summary = await this.queryMetricsSummaryUseCase.execute({
      assetId: data.assetId,
      start,
      end,
    });

    const actualValue = this.getActualValue(data.metricType, summary);

    if (actualValue === null) {
      state.markNormal(now, null);
      await this.stateRepository.update(state);

      return {
        triggeredEvent: null,
        recovered:
          previousStatus === 'VIOLATING' || previousStatus === 'ALERTED',
      };
    }

    const isViolating = rule.matches(actualValue);

    if (!isViolating) {
      state.markNormal(now, actualValue);
      await this.stateRepository.update(state);

      return {
        triggeredEvent: null,
        recovered:
          previousStatus === 'VIOLATING' || previousStatus === 'ALERTED',
      };
    }

    state.markViolating(now, actualValue);

    const shouldTriggerAlert = state.shouldTriggerAlert(
      now,
      data.durationSeconds,
    );

    if (!shouldTriggerAlert) {
      await this.stateRepository.update(state);

      return {
        triggeredEvent: null,
        recovered: false,
      };
    }

    const event: MetricRuleViolation = {
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      thresholdValue: data.thresholdValue,
      actualValue,
      message:
        `${data.metricType} threshold exceeded for asset ${data.assetId}: ` +
        `${actualValue}% >= ${data.thresholdValue}% for ${data.durationSeconds}s`,
      evaluatedAt: now,
    };

    state.markAlerted(now);

    await this.stateRepository.update(state);

    return {
      triggeredEvent: event,
      recovered: false,
    };
  }

  private getActualValue(
    metricType: MetricRuleType,
    summary: {
      cpu: {
        averageUsagePercent: number | null;
      };
      memory: {
        usagePercent: number;
      } | null;
      disks: Array<{
        usagePercent: number;
      }>;
    },
  ): number | null {
    if (metricType === MetricRuleType.CPU_USAGE) {
      return summary.cpu.averageUsagePercent;
    }

    if (metricType === MetricRuleType.MEMORY_USAGE) {
      return summary.memory?.usagePercent ?? null;
    }

    if (metricType === MetricRuleType.DISK_USAGE) {
      if (summary.disks.length === 0) {
        return null;
      }

      return Math.max(...summary.disks.map((disk) => disk.usagePercent));
    }

    return null;
  }
}

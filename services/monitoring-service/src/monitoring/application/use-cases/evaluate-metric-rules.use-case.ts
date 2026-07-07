import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  MetricRule,
  MetricRuleType,
  MetricRuleOperator,
  MetricRuleSeverity,
} from '../../domain/entities/metric-rule.entity';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import { QueryMetricsSummaryUseCase } from './query-metrics-summary.use-case';

export interface MetricRuleViolation {
  ruleId: string;
  assetId: string;
  metricType: MetricRuleType;
  severity: MetricRuleSeverity;
  thresholdValue: number;
  actualValue: number;
  message: string;
  evaluatedAt: Date;
}

export interface EvaluateMetricRulesResult {
  checked: number;
  violated: number;
  violations: MetricRuleViolation[];
}

@Injectable()
export class EvaluateMetricRulesUseCase {
  private readonly logger = new Logger(EvaluateMetricRulesUseCase.name);

  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,

    private readonly queryMetricsSummaryUseCase: QueryMetricsSummaryUseCase,
  ) {}

  async execute(): Promise<EvaluateMetricRulesResult> {
    const rules = await this.metricRuleRepository.findEnabled();

    const result: EvaluateMetricRulesResult = {
      checked: rules.length,
      violated: 0,
      violations: [],
    };

    const now = new Date();

    for (const rule of rules) {
      try {
        const violation = await this.evaluateSingleRule(rule, now);

        if (!violation) {
          continue;
        }

        result.violated += 1;
        result.violations.push(violation);

        this.logger.warn(violation.message);
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
  ): Promise<MetricRuleViolation | null> {
    const data = rule.toObject();

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
      return null;
    }

    if (!rule.matches(actualValue)) {
      return null;
    }
    const operatorSymbol = this.toOperatorSymbol(data.operator);

    return {
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      thresholdValue: data.thresholdValue,
      actualValue,
      message:
        `${data.metricType} threshold exceeded for asset ${data.assetId}: ` +
        `${actualValue}% ${operatorSymbol} ${data.thresholdValue}%`,
      evaluatedAt: now,
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
  private toOperatorSymbol(operator: MetricRuleOperator): string {
    if (operator === MetricRuleOperator.GREATER_THAN) {
      return '>';
    }

    if (operator === MetricRuleOperator.GREATER_THAN_OR_EQUAL) {
      return '>=';
    }

    return '';
  }
}

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
  type AlertEvent,
} from '../../domain/ports/alert-event-publisher.port';
import {
  ASSET_READER,
  type AssetReader,
  type AssetSnapshot,
} from '../../domain/ports/asset-reader.port';

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
  skipped: number;
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

    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    private readonly queryMetricsSummaryUseCase: QueryMetricsSummaryUseCase,
  ) {}

  async execute(): Promise<EvaluateMetricRulesResult> {
    const rules = await this.metricRuleRepository.findEnabled();

    const result: EvaluateMetricRulesResult = {
      checked: rules.length,
      skipped: 0,
      triggered: 0,
      recovered: 0,
      events: [],
    };

    const now = new Date();

    const assetCache = new Map<string, AssetSnapshot | null>();

    for (const rule of rules) {
      const data = rule.toObject();

      try {
        if (!assetCache.has(data.assetId)) {
          const asset = await this.assetReader.findById(data.assetId);

          assetCache.set(data.assetId, asset);
        }

        const asset = assetCache.get(data.assetId) ?? null;

        if (!asset) {
          throw new NotFoundException(
            `Asset with ID ${data.assetId} not found`,
          );
        }

        if (asset.status !== 'ACTIVATE') {
          result.skipped += 1;
          continue;
        }

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
      state.markNoData(now);
      await this.stateRepository.update(state);

      return {
        triggeredEvent: null,
        recovered: false,
      };
    }

    const isViolating = rule.matches(actualValue);

    if (!isViolating) {
      state.markNormal(now, actualValue);
      await this.stateRepository.update(state);

      if (previousStatus === 'ALERTED') {
        await this.alertEventPublisher.publish({
          eventId: randomUUID(),
          eventType: 'METRIC_THRESHOLD_RECOVERED',
          ruleId: data.ruleId,
          assetId: data.assetId,
          metricType: data.metricType,
          severity: data.severity,
          thresholdValue: data.thresholdValue,
          actualValue,
          occurredAt: now,
          message:
            `${data.metricType} recovered for asset ${data.assetId}: ` +
            `${actualValue}% is below ${data.thresholdValue}%`,
        });
      }

      return {
        triggeredEvent: null,
        recovered: previousStatus === 'ALERTED',
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

    const alertEvent: AlertEvent = {
      eventId: randomUUID(),
      eventType: 'METRIC_THRESHOLD_EXCEEDED',
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      thresholdValue: data.thresholdValue,
      actualValue,
      occurredAt: now,
      message: event.message,
    };

    await this.alertEventPublisher.publish(alertEvent);

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

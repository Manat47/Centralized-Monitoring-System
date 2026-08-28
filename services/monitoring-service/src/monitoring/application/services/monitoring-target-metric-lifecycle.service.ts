import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { MetricRuleEvaluationState } from '../../domain/entities/metric-rule-evaluation-state.entity';
import type { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';
import {
  METRIC_RULE_EVALUATION_STATE_REPOSITORY,
  type MetricRuleEvaluationStateRepository,
} from '../../domain/repositories/metric-rule-evaluation-state.repository';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';

export type MonitoringTargetRuntimeState = 'RUNNING' | 'PAUSED' | 'ARCHIVED';

@Injectable()
export class MonitoringTargetMetricLifecycleService {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,
    @Inject(METRIC_RULE_EVALUATION_STATE_REPOSITORY)
    private readonly stateRepository: MetricRuleEvaluationStateRepository,
    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
  ) {}

  async transition(
    target: MonitoringTarget,
    state: MonitoringTargetRuntimeState,
  ): Promise<number> {
    const data = target.toObject();

    if (data.monitoringType !== 'NODE_EXPORTER') {
      return 0;
    }

    const rules = await this.metricRuleRepository.findByAssetId(data.assetId);
    const enabledRules = rules.filter(({ rule }) => rule.enabled);

    for (const { rule } of enabledRules) {
      let evaluation = await this.stateRepository.findByRuleId(rule.ruleId);

      if (!evaluation) {
        if (state === 'RUNNING') {
          continue;
        }

        evaluation = MetricRuleEvaluationState.create(randomUUID(), {
          ruleId: rule.ruleId,
          assetId: rule.assetId,
        });
        evaluation.markSourceUnavailable(data.updatedAt);
        await this.stateRepository.create(evaluation);
        continue;
      }

      if (state === 'RUNNING') {
        evaluation.reset(data.updatedAt);
      } else {
        evaluation.markSourceUnavailable(data.updatedAt);
      }

      await this.stateRepository.update(evaluation);
    }

    await this.alertEventPublisher.publish({
      eventId: randomUUID(),
      eventType: 'MONITORING_TARGET_STATE_CHANGED',
      monitoringTargetId: data.targetId,
      assetId: data.assetId,
      monitoringType: data.monitoringType,
      state,
      occurredAt: data.updatedAt,
    });

    return enabledRules.length;
  }
}

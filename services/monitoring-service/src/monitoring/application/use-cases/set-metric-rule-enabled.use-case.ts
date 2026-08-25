import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { MetricRule } from '../../domain/entities/metric-rule.entity';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';
import {
  METRIC_RULE_EVALUATION_STATE_REPOSITORY,
  type MetricRuleEvaluationStateRepository,
} from '../../domain/repositories/metric-rule-evaluation-state.repository';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

export interface SetMetricRuleEnabledInput {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class SetMetricRuleEnabledUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly repository: MetricRuleRepository,
    @Inject(METRIC_RULE_EVALUATION_STATE_REPOSITORY)
    private readonly stateRepository: MetricRuleEvaluationStateRepository,
    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
  ) {}

  async execute(
    ruleId: string,
    enabled: boolean,
    input: SetMetricRuleEnabledInput,
  ): Promise<MetricRule> {
    const rule = await this.repository.findById(ruleId);

    if (!rule) {
      throw new NotFoundException(`Metric rule with ID ${ruleId} not found`);
    }

    const before = rule.toObject();
    if (before.archivedAt) {
      throw new BadRequestException('Archived metric rule cannot be changed');
    }
    if (before.enabled === enabled) {
      throw new BadRequestException(
        `Metric rule is already ${enabled ? 'enabled' : 'disabled'}`,
      );
    }

    if (enabled) {
      const target =
        await this.monitoringTargetRepository.findByAssetIdAndMonitoringType(
          before.assetId,
          'NODE_EXPORTER',
        );
      const targetData = target?.toObject();
      if (
        !targetData ||
        targetData.verificationStatus !== 'VERIFIED' ||
        !targetData.monitoringEnabled
      ) {
        throw new BadRequestException(
          'Metric rules require a verified and enabled monitoring target',
        );
      }
    }

    if (enabled) rule.enable();
    else rule.disable();
    const updated = await this.repository.update(rule);
    const occurredAt = updated.toObject().updatedAt;

    if (enabled) {
      const state = await this.stateRepository.findByRuleId(ruleId);
      if (state) {
        state.reset();
        await this.stateRepository.update(state);
      }
    } else {
      await this.alertEventPublisher.publish({
        eventId: randomUUID(),
        eventType: 'METRIC_RULE_STATE_CHANGED',
        ruleId,
        assetId: before.assetId,
        state: 'DISABLED',
        occurredAt,
        message: 'Metric alert resolved because its rule was disabled',
      });
    }

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: enabled ? 'METRIC_RULE_ENABLED' : 'METRIC_RULE_DISABLED',
      resourceType: 'METRIC_RULE',
      resourceId: ruleId,
      result: 'SUCCESS',
      metadata: { assetId: before.assetId, enabled },
      occurredAt,
    });

    return updated;
  }
}

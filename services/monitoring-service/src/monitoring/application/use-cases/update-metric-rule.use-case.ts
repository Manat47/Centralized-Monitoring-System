import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MetricRule,
  type MetricRuleOperator,
  type MetricRuleType,
} from '../../domain/entities/metric-rule.entity';
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

export interface UpdateMetricRuleInput {
  metricType?: MetricRuleType;
  operator?: MetricRuleOperator;
  warningEnabled?: boolean;
  warningThreshold?: number;
  warningDurationSeconds?: number;
  criticalThreshold?: number;
  criticalDurationSeconds?: number;
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class UpdateMetricRuleUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly repository: MetricRuleRepository,
    @Inject(METRIC_RULE_EVALUATION_STATE_REPOSITORY)
    private readonly stateRepository: MetricRuleEvaluationStateRepository,
    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    ruleId: string,
    input: UpdateMetricRuleInput,
  ): Promise<MetricRule> {
    const rule = await this.repository.findById(ruleId);

    if (!rule) {
      throw new NotFoundException(`Metric rule with ID ${ruleId} not found`);
    }

    const before = rule.toObject();

    try {
      rule.updateConfiguration({
        metricType: input.metricType ?? before.metricType,
        operator: input.operator ?? before.operator,
        warningEnabled: input.warningEnabled ?? before.warningEnabled,
        warningThreshold: input.warningThreshold ?? before.warningThreshold,
        warningDurationSeconds:
          input.warningDurationSeconds ?? before.warningDurationSeconds,
        criticalThreshold: input.criticalThreshold ?? before.criticalThreshold,
        criticalDurationSeconds:
          input.criticalDurationSeconds ?? before.criticalDurationSeconds,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid metric rule update',
      );
    }

    if (await this.repository.findDuplicate(rule, ruleId)) {
      throw new ConflictException(
        'A metric rule for this metric type already exists on this asset.',
      );
    }

    let updated: MetricRule;
    try {
      updated = await this.repository.update(rule);
    } catch (error) {
      if (this.isDuplicateViolation(error)) {
        throw new ConflictException(
          'A metric rule for this metric type already exists on this asset.',
        );
      }
      throw error;
    }
    const state = await this.stateRepository.findByRuleId(ruleId);

    if (state) {
      state.reset();
      await this.stateRepository.update(state);
    }

    const occurredAt = updated.toObject().updatedAt;
    await this.alertEventPublisher.publish({
      eventId: randomUUID(),
      eventType: 'METRIC_RULE_STATE_CHANGED',
      ruleId,
      assetId: before.assetId,
      state: 'UPDATED',
      occurredAt,
      message: 'Metric alert resolved because its rule configuration changed',
    });
    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'METRIC_RULE_UPDATED',
      resourceType: 'METRIC_RULE',
      resourceId: ruleId,
      result: 'SUCCESS',
      metadata: { assetId: before.assetId, before, after: updated.toObject() },
      occurredAt,
    });

    return updated;
  }

  private isDuplicateViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}

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
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';

@Injectable()
export class ArchiveMetricRuleUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly repository: MetricRuleRepository,
    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    ruleId: string,
    input: {
      actorUserId: string;
      actorRole: UserRole;
      actorEmail?: string | null;
    },
  ): Promise<MetricRule> {
    const rule = await this.repository.findById(ruleId);
    if (!rule) {
      throw new NotFoundException(`Metric rule with ID ${ruleId} not found`);
    }

    const before = rule.toObject();
    try {
      rule.archive();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Metric rule cannot be archived',
      );
    }

    const archived = await this.repository.update(rule);
    const occurredAt = archived.toObject().updatedAt;
    await this.alertEventPublisher.publish({
      eventId: randomUUID(),
      eventType: 'METRIC_RULE_STATE_CHANGED',
      ruleId,
      assetId: before.assetId,
      state: 'ARCHIVED',
      occurredAt,
      message: 'Metric alert resolved because its rule was archived',
    });
    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'METRIC_RULE_ARCHIVED',
      resourceType: 'METRIC_RULE',
      resourceId: ruleId,
      result: 'SUCCESS',
      metadata: { assetId: before.assetId },
      occurredAt,
    });

    return archived;
  }
}

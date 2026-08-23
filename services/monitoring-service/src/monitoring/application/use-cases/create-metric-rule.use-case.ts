import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MetricRule,
  type CreateMetricRuleProps,
} from '../../domain/entities/metric-rule.entity';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface CreateMetricRuleInput extends CreateMetricRuleProps {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class CreateMetricRuleUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(input: CreateMetricRuleInput): Promise<MetricRule> {
    const { actorUserId, actorRole, ...ruleData } = input;

    const asset = await this.assetReader.findById(ruleData.assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID ${ruleData.assetId} not found`,
      );
    }

    if (asset.assetType !== 'SERVER') {
      throw new BadRequestException(
        'Metric rules can only be created for SERVER assets',
      );
    }

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Deactivated asset cannot be configured with metric rules',
      );
    }

    const ruleId = randomUUID();

    const rule = MetricRule.create(ruleId, ruleData);

    const createdRule = await this.metricRuleRepository.create(rule);

    await this.auditEventPublisher.publish({
      actorUserId,
      actorRole,

      action: 'METRIC_RULE_CREATED',

      resourceType: 'METRIC_RULE',
      resourceId: ruleId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return createdRule;
  }
}

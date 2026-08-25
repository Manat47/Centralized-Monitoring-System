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
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

export interface CreateMetricRuleInput extends CreateMetricRuleProps {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
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

    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
  ) {}

  async execute(input: CreateMetricRuleInput): Promise<MetricRule> {
    const { actorUserId, actorRole, actorEmail, ...ruleData } = input;

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

    const target =
      await this.monitoringTargetRepository.findByAssetIdAndMonitoringType(
        ruleData.assetId,
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

    const ruleId = randomUUID();

    const rule = MetricRule.create(ruleId, ruleData);

    if (await this.metricRuleRepository.findDuplicate(rule)) {
      throw new BadRequestException(
        'An active metric rule with the same configuration already exists',
      );
    }

    let createdRule: MetricRule;
    try {
      createdRule = await this.metricRuleRepository.create(rule);
    } catch (error) {
      if (this.isDuplicateViolation(error)) {
        throw new BadRequestException(
          'An active metric rule with the same configuration already exists',
        );
      }
      throw error;
    }

    await this.auditEventPublisher.publish({
      actorUserId,
      actorRole,
      actorEmail,

      action: 'METRIC_RULE_CREATED',

      resourceType: 'METRIC_RULE',
      resourceId: ruleId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return createdRule;
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

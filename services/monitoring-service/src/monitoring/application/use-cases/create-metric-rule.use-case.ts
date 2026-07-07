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

@Injectable()
export class CreateMetricRuleUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(input: CreateMetricRuleProps): Promise<MetricRule> {
    const asset = await this.assetReader.findById(input.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    if (asset.assetType !== 'SERVER') {
      throw new BadRequestException(
        'Metric rules can only be created for SERVER assets',
      );
    }

    if (asset.status !== 'ACTIVATE') {
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    const rule = MetricRule.create(randomUUID(), input);

    return this.metricRuleRepository.create(rule);
  }
}

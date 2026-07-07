import { Inject, Injectable } from '@nestjs/common';

import { MetricRule } from '../../domain/entities/metric-rule.entity';
import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';

@Injectable()
export class FindMetricRulesUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,
  ) {}

  async execute(): Promise<MetricRule[]> {
    return this.metricRuleRepository.findAll();
  }
}

import { Inject, Injectable } from '@nestjs/common';

import {
  METRIC_RULE_REPOSITORY,
  type MetricRuleListItem,
  type MetricRuleRepository,
} from '../../domain/repositories/metric-rule.repository';

@Injectable()
export class FindMetricRulesUseCase {
  constructor(
    @Inject(METRIC_RULE_REPOSITORY)
    private readonly metricRuleRepository: MetricRuleRepository,
  ) {}

  async execute(includeArchived = false): Promise<MetricRuleListItem[]> {
    return this.metricRuleRepository.findAll(includeArchived);
  }
}

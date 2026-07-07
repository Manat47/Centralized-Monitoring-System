import { MetricRule } from '../entities/metric-rule.entity';

export const METRIC_RULE_REPOSITORY = Symbol('METRIC_RULE_REPOSITORY');

export interface MetricRuleRepository {
  create(rule: MetricRule): Promise<MetricRule>;

  findAll(): Promise<MetricRule[]>;

  findEnabled(): Promise<MetricRule[]>;

  findByAssetId(assetId: string): Promise<MetricRule[]>;

  findById(ruleId: string): Promise<MetricRule | null>;

  update(rule: MetricRule): Promise<MetricRule>;
}

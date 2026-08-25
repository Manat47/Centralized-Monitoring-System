import {
  MetricRule,
  type MetricRuleProps,
} from '../entities/metric-rule.entity';
import type { MetricRuleEvaluationStateProps } from '../entities/metric-rule-evaluation-state.entity';

export const METRIC_RULE_REPOSITORY = Symbol('METRIC_RULE_REPOSITORY');

export interface MetricRuleListItem {
  rule: MetricRuleProps;
  evaluation: MetricRuleEvaluationStateProps | null;
}

export interface MetricRuleRepository {
  create(rule: MetricRule): Promise<MetricRule>;

  findAll(includeArchived?: boolean): Promise<MetricRuleListItem[]>;

  findEnabled(): Promise<MetricRule[]>;

  findByAssetId(
    assetId: string,
    includeArchived?: boolean,
  ): Promise<MetricRuleListItem[]>;

  findById(ruleId: string): Promise<MetricRule | null>;

  update(rule: MetricRule): Promise<MetricRule>;

  findDuplicate(
    rule: MetricRule,
    excludeRuleId?: string,
  ): Promise<MetricRule | null>;
}

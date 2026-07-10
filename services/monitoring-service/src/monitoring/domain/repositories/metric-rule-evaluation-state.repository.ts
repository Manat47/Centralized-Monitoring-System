import { MetricRuleEvaluationState } from '../entities/metric-rule-evaluation-state.entity';

export const METRIC_RULE_EVALUATION_STATE_REPOSITORY = Symbol(
  'METRIC_RULE_EVALUATION_STATE_REPOSITORY',
);

export interface MetricRuleEvaluationStateRepository {
  create(state: MetricRuleEvaluationState): Promise<MetricRuleEvaluationState>;

  findByRuleId(ruleId: string): Promise<MetricRuleEvaluationState | null>;

  update(state: MetricRuleEvaluationState): Promise<MetricRuleEvaluationState>;
}

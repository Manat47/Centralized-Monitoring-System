export type MetricRuleType = "CPU_USAGE" | "MEMORY_USAGE" | "DISK_USAGE";

export type MetricRuleOperator = "GREATER_THAN" | "GREATER_THAN_OR_EQUAL";

export type MetricRuleSeverity = "WARNING" | "CRITICAL";

export interface MetricRule {
  ruleId: string;
  assetId: string;
  metricType: MetricRuleType;
  operator: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds: number;
  severity: MetricRuleSeverity;
  enabled: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateMetricRuleInput {
  assetId: string;
  metricType: MetricRuleType;
  operator?: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds?: number;
  severity: MetricRuleSeverity;
}

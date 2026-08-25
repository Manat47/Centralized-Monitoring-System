export type MetricRuleType = "CPU_USAGE" | "MEMORY_USAGE" | "DISK_USAGE";

export type MetricRuleOperator = "GREATER_THAN" | "GREATER_THAN_OR_EQUAL";

export type MetricRuleSeverity = "WARNING" | "CRITICAL";
export type MetricRuleEvaluationStatus =
  | "NORMAL"
  | "VIOLATING"
  | "ALERTED"
  | "RECOVERED";

export interface MetricRuleEvaluation {
  stateId: string;
  ruleId: string;
  assetId: string;
  status: MetricRuleEvaluationStatus;
  violatedSince: string | null;
  lastEvaluatedAt: string | null;
  lastActualValue: number | null;
  lastTriggeredAt: string | null;
  recoveredAt: string | null;
  dataStatus: "UNKNOWN" | "NO_DATA" | "AVAILABLE";
  createdAt: string;
  updatedAt: string;
}

export interface MetricRule {
  ruleId: string;
  assetId: string;
  metricType: MetricRuleType;
  operator: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds: number;
  severity: MetricRuleSeverity;
  enabled: boolean;
  archivedAt: string | null;
  evaluation: MetricRuleEvaluation | null;

  createdAt: string;
  updatedAt: string;
}

export type UpdateMetricRuleInput = Omit<CreateMetricRuleInput, "assetId">;

export interface CreateMetricRuleInput {
  assetId: string;
  metricType: MetricRuleType;
  operator?: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds?: number;
  severity: MetricRuleSeverity;
}

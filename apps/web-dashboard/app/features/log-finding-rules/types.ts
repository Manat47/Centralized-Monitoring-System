export type LogFindingSeverity = "low" | "medium" | "high" | "critical";

export interface LogFindingRule {
  id: string;
  name: string;
  serviceName: string;
  searchQuery: string;
  severity: LogFindingSeverity;
  threshold: number;
  timeWindowSeconds: number;
  cooldownMinutes: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LogFindingRuleWithSummary extends LogFindingRule {
  lastTriggeredAt: string | null;
  triggeredFingerprintCount: number;
}

export type LogFindingRuleInput = Pick<
  LogFindingRule,
  "name" | "serviceName" | "searchQuery" | "severity" | "threshold" |
  "timeWindowSeconds" | "cooldownMinutes" | "isEnabled"
>;

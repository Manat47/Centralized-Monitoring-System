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

export type LogFindingRuleInput = Pick<
  LogFindingRule,
  "name" | "serviceName" | "searchQuery" | "severity" | "threshold" |
  "timeWindowSeconds" | "cooldownMinutes" | "isEnabled"
>;

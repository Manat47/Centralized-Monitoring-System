export interface LogFindingAlertEvent {
  eventId: string;
  eventType: 'log_finding_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  service: string;
  ruleId: string;
  fingerprint: string;
  matchCount: number;
  countOverflow: boolean;
  timeWindowSeconds: number;
  snippet: string;
  deepLink: string;
  timestamp: string;
  isSummary: boolean;
}

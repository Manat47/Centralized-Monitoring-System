import type { StoredLog } from './log-event.entity';

export interface ActivityRule {
  ruleId: string;
  projectId: string;
  name: string;
  eventType: string;
  conditionField: string;
  conditionValue: string;
  groupBy: 'project' | 'client.ip' | 'user_id' | 'token_id';
  dataSource: 'ACCEPTED_RECORDS' | 'LOG_API_REQUESTS';
  threshold: number;
  windowMinutes: number;
  enabled: boolean;
  activatedAt: string;
  createdAt: string;
  updatedAt: string;
  sampleCount?: number;
  waitingForData?: boolean;
}

export interface RuleMatch {
  rule: ActivityRule;
  groupValue: string;
}

export function ruleValue(event: StoredLog, field: string): string | undefined {
  if (field === 'source') return event.source;
  if (field === 'event_type') return event.event_type;
  if (field === 'severity') return event.severity;
  if (field === 'user_id') return event.user_id;
  if (field === 'client.ip') return event.client?.ip;
  if (field === 'status_code') return event.status_code?.toString();
  if (field === 'token_id') return event.tokenId;
  return undefined;
}

export function matchActivityRule(
  rule: ActivityRule,
  event: StoredLog,
): RuleMatch | null {
  if (
    !rule.enabled ||
    rule.dataSource !== 'ACCEPTED_RECORDS' ||
    rule.eventType !== event.event_type ||
    ruleValue(event, rule.conditionField) !== rule.conditionValue
  )
    return null;
  const groupValue =
    rule.groupBy === 'project' ? 'project' : ruleValue(event, rule.groupBy);
  return groupValue ? { rule, groupValue } : null;
}

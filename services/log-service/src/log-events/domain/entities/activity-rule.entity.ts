import type { StoredLog } from './log-event.entity';

export type ActivityGroupBy = 'client.ip' | 'user_id';

export interface ActivityRule {
  ruleId: string;
  projectId: string;
  name: string;
  eventType: string;
  conditionField: string;
  conditionValue: string;
  groupBy: ActivityGroupBy;
  threshold: number;
  windowMinutes: number;
  enabled: boolean;
  activatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuleMatch {
  rule: ActivityRule;
  groupValue: string;
}

export function conditionValue(
  event: StoredLog,
  field: string,
): string | undefined {
  if (field === 'severity') return event.severity;
  if (field === 'client.device_type') return event.client?.device_type;
  if (field === 'client.ip') return event.client?.ip;
  if (field === 'user_id') return event.user_id;
  if (field.startsWith('metadata.')) {
    const value = event.metadata?.[field.slice('metadata.'.length)];
    return value === null || value === undefined ? undefined : String(value);
  }
  return undefined;
}

export function matchActivityRule(
  rule: ActivityRule,
  event: StoredLog,
): RuleMatch | null {
  if (
    !rule.enabled ||
    event.kind !== 'ACTIVITY' ||
    rule.eventType !== event.event_type
  )
    return null;
  const value = conditionValue(event, rule.conditionField);
  if (value !== rule.conditionValue) return null;
  const groupValue =
    rule.groupBy === 'client.ip' ? event.client?.ip : event.user_id;
  return groupValue ? { rule, groupValue } : null;
}

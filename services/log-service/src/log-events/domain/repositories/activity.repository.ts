import type { StoredLog } from '../entities/log-event.entity';
import type { ActivityRule, RuleMatch } from '../entities/activity-rule.entity';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface ActivityFilters {
  from: string;
  to: string;
  userId?: string;
  ip?: string;
  eventType?: string;
  condition?: string;
  search?: string;
  tag?: string;
  limit: number;
  offset: number;
}

export interface RuleDraft {
  name: string;
  eventType: string;
  conditionField: string;
  conditionValue: string;
  groupBy: 'client.ip' | 'user_id';
  threshold: number;
  windowMinutes: number;
}

export interface ActivityActor {
  userId: string;
  role: 'ADMIN' | 'OPERATOR';
  email?: string;
}

export interface ActivityRepository {
  process(
    projectId: string,
    event: StoredLog,
    matches: RuleMatch[],
  ): Promise<void>;
  activeRules(projectId: string): Promise<ActivityRule[]>;
  listRules(projectId: string): Promise<ActivityRule[]>;
  createRule(
    projectId: string,
    actor: ActivityActor,
    draft: RuleDraft,
  ): Promise<ActivityRule>;
  setRuleEnabled(
    projectId: string,
    actor: ActivityActor,
    ruleId: string,
    enabled: boolean,
  ): Promise<ActivityRule | null>;
  search(
    projectId: string,
    filters: ActivityFilters,
  ): Promise<{ items: StoredLog[]; nextOffset: number | null }>;
  insights(
    projectId: string,
    filters: Omit<ActivityFilters, 'limit' | 'offset'>,
  ): Promise<{
    totalLogins: number;
    activeDays: number;
    latestClient: {
      ip: string | null;
      deviceType: string | null;
      timestamp: string;
    } | null;
    latestSession: {
      sessionId: string;
      userId: string | null;
      loginAt: string;
      logoutAt: string | null;
      activeDurationMs: number | null;
    } | null;
  }>;
  findings(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: Record<string, unknown>[]; nextOffset: number | null }>;
  cleanup(): Promise<void>;
}

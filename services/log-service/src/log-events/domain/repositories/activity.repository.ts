import type { StoredLog } from '../entities/log-event.entity';
import type { ActivityRule, RuleMatch } from '../entities/activity-rule.entity';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');
export interface RequestReceipt {
  requestId: string;
  projectId: string | null;
  tokenId: string | null;
  receivedAt: string;
  httpStatus: number;
  reason: string | null;
  acceptedRecords: number;
}
export interface RuleDraft {
  name: string;
  eventType: string;
  conditionField: string;
  conditionValue: string;
  groupBy: 'project' | 'client.ip' | 'user_id' | 'token_id';
  threshold: number;
  windowMinutes: number;
  dataSource: 'ACCEPTED_RECORDS' | 'LOG_API_REQUESTS';
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
  processRequest(receipt: RequestReceipt): Promise<void>;
  activeRules(projectId: string): Promise<ActivityRule[]>;
  listRules(projectId: string): Promise<ActivityRule[]>;
  preview(
    projectId: string,
    draft: RuleDraft,
  ): Promise<{ matchingRecords: number; usableGroupRecords: number }>;
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
  findings(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: Record<string, unknown>[]; nextOffset: number | null }>;
  cleanup(): Promise<void>;
}

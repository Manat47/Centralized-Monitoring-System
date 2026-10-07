import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../../project.service';
import { ProjectService } from '../../../project.service';
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
  type RuleDraft,
} from '../../domain/repositories/activity.repository';

@Injectable()
export class ActivityAnalysisService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepository,
    private readonly projects: ProjectService,
  ) {}

  async rules(projectId: string, actor: Actor) {
    await this.projects.membership(projectId, actor);
    return this.repository.listRules(projectId);
  }

  async createRule(projectId: string, actor: Actor, input: RuleDraft) {
    await this.projects.membership(projectId, actor, ['OWNER']);
    return this.repository.createRule(
      projectId,
      actor,
      this.validateDraft(input),
    );
  }

  async preview(projectId: string, actor: Actor, input: RuleDraft) {
    await this.projects.membership(projectId, actor, ['OWNER']);
    return this.repository.preview(projectId, this.validateDraft(input));
  }

  private validateDraft(input: RuleDraft): RuleDraft {
    const name = typeof input?.name === 'string' ? input.name.trim() : '';
    const eventType =
      typeof input?.eventType === 'string' ? input.eventType.trim() : '';
    const field =
      typeof input?.conditionField === 'string'
        ? input.conditionField.trim()
        : '';
    const rawValue =
      typeof input?.conditionValue === 'string'
        ? input.conditionValue.trim()
        : '';
    const value =
      field === 'severity'
        ? rawValue.toUpperCase() === 'WARNING'
          ? 'WARN'
          : rawValue.toUpperCase()
        : rawValue;
    const dataSource = input?.dataSource;
    const requestRule = dataSource === 'LOG_API_REQUESTS';
    const sourceFilter =
      typeof input?.sourceFilter === 'string'
        ? input.sourceFilter.trim()
        : null;
    if (
      !name ||
      name.length > 100 ||
      !eventType ||
      eventType.length > 100 ||
      !value ||
      value.length > 256 ||
      (input?.sourceFilter != null && typeof input.sourceFilter !== 'string') ||
      (sourceFilter !== null &&
        (sourceFilter.length === 0 ||
          sourceFilter.length > 100 ||
          requestRule)) ||
      !['ACCEPTED_RECORDS', 'LOG_API_REQUESTS'].includes(dataSource) ||
      (requestRule
        ? eventType !== 'log_api.request' ||
          !['http_status', 'result'].includes(field) ||
          !['project', 'token_id'].includes(input.groupBy) ||
          !(
            value === 'any' ||
            (field === 'http_status' && /^\d{3}$/.test(value)) ||
            (field === 'result' && ['accepted', 'rejected'].includes(value))
          )
        : ![
            'source',
            'event_type',
            'severity',
            'client.ip',
            'user_id',
            'status_code',
          ].includes(field) ||
          !['project', 'client.ip', 'user_id', 'token_id'].includes(
            input.groupBy,
          ) ||
          (field === 'severity' &&
            !['INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(value)) ||
          (field === 'status_code' && !/^\d{1,3}$/.test(value))) ||
      !Number.isInteger(input.threshold) ||
      input.threshold < 2 ||
      input.threshold > 1000 ||
      !Number.isInteger(input.windowMinutes) ||
      input.windowMinutes < 1 ||
      input.windowMinutes > 60
    )
      throw new BadRequestException('Invalid detection rule');
    return {
      name,
      eventType,
      conditionField: field,
      conditionValue: value,
      sourceFilter,
      groupBy: input.groupBy,
      threshold: input.threshold,
      windowMinutes: input.windowMinutes,
      dataSource,
    };
  }

  async setRuleEnabled(
    projectId: string,
    actor: Actor,
    ruleId: string,
    enabled: unknown,
  ) {
    await this.projects.membership(projectId, actor, ['OWNER']);
    if (typeof enabled !== 'boolean')
      throw new BadRequestException('enabled must be a boolean');
    const rule = await this.repository.setRuleEnabled(
      projectId,
      actor,
      ruleId,
      enabled,
    );
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async findings(
    projectId: string,
    actor: Actor,
    input: Record<string, unknown>,
  ) {
    await this.projects.membership(projectId, actor);
    const limit = input.limit === undefined ? 50 : Number(input.limit);
    const offset = input.offset === undefined ? 0 : Number(input.offset);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 10_000
    )
      throw new BadRequestException('Invalid pagination');
    return this.repository.findings(projectId, limit, offset);
  }
}

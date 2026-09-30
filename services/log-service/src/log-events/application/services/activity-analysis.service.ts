import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isIP } from 'node:net';
import type { Actor } from '../../../project.service';
import { ProjectService } from '../../../project.service';
import {
  ACTIVITY_REPOSITORY,
  type ActivityFilters,
  type ActivityRepository,
  type RuleDraft,
} from '../../domain/repositories/activity.repository';

type QueryInput = Record<string, unknown>;

@Injectable()
export class ActivityAnalysisService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepository,
    private readonly projects: ProjectService,
  ) {}

  private async member(projectId: string, actor: Actor, owner = false) {
    await this.projects.membership(
      projectId,
      actor,
      owner ? ['OWNER'] : undefined,
    );
  }

  private filters(input: QueryInput): ActivityFilters {
    const allowed = new Set([
      'from',
      'to',
      'user_id',
      'ip',
      'event_type',
      'condition',
      'search',
      'tag',
      'limit',
      'offset',
    ]);
    for (const key of Object.keys(input))
      if (!allowed.has(key))
        throw new BadRequestException(`Unknown filter: ${key}`);
    const now = Date.now();
    const from =
      input.from === undefined
        ? now - 24 * 3600_000
        : typeof input.from === 'string'
          ? Date.parse(input.from)
          : NaN;
    const to =
      input.to === undefined
        ? now + 1000
        : typeof input.to === 'string'
          ? Date.parse(input.to)
          : NaN;
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from >= to ||
      from < now - 30 * 86400_000 ||
      to > now + 5 * 60_000
    )
      throw new BadRequestException('Invalid time range');
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
    const text = (key: string, max: number) => {
      if (input[key] === undefined || input[key] === '') return undefined;
      if (typeof input[key] !== 'string' || input[key].length > max)
        throw new BadRequestException(`Invalid ${key}`);
      return input[key];
    };
    const ip = text('ip', 45);
    if (ip && !isIP(ip)) throw new BadRequestException('Invalid ip');
    const condition = text('condition', 32);
    if (condition && !['success', 'failed', 'failure'].includes(condition))
      throw new BadRequestException('Invalid condition');
    return {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      userId: text('user_id', 128),
      ip,
      eventType: text('event_type', 100),
      condition,
      search: text('search', 200),
      tag: text('tag', 64),
      limit,
      offset,
    };
  }

  async search(projectId: string, actor: Actor, input: QueryInput) {
    await this.member(projectId, actor);
    return this.repository.search(projectId, this.filters(input));
  }

  async insights(projectId: string, actor: Actor, input: QueryInput) {
    await this.member(projectId, actor);
    const filters = this.filters(input);
    return this.repository.insights(projectId, {
      from: filters.from,
      to: filters.to,
      userId: filters.userId,
      ip: filters.ip,
      eventType: filters.eventType,
      condition: filters.condition,
      search: filters.search,
      tag: filters.tag,
    });
  }

  async rules(projectId: string, actor: Actor) {
    await this.member(projectId, actor);
    return this.repository.listRules(projectId);
  }

  async createRule(projectId: string, actor: Actor, input: RuleDraft) {
    await this.member(projectId, actor, true);
    const name = typeof input?.name === 'string' ? input.name.trim() : '';
    const eventType =
      typeof input?.eventType === 'string' ? input.eventType.trim() : '';
    const field =
      typeof input?.conditionField === 'string'
        ? input.conditionField.trim()
        : '';
    const value =
      typeof input?.conditionValue === 'string'
        ? input.conditionValue.trim()
        : '';
    if (
      !name ||
      name.length > 100 ||
      !eventType ||
      eventType.length > 100 ||
      !value ||
      value.length > 256 ||
      !(
        field === 'severity' ||
        field === 'client.device_type' ||
        field === 'client.ip' ||
        field === 'user_id' ||
        /^metadata\.[A-Za-z0-9_]{1,64}$/.test(field)
      ) ||
      !['client.ip', 'user_id'].includes(input.groupBy) ||
      !Number.isInteger(input.threshold) ||
      input.threshold < 2 ||
      input.threshold > 1000 ||
      !Number.isInteger(input.windowMinutes) ||
      input.windowMinutes < 1 ||
      input.windowMinutes > 60
    )
      throw new BadRequestException('Invalid detection rule');
    return this.repository.createRule(projectId, actor, {
      name,
      eventType,
      conditionField: field,
      conditionValue: value,
      groupBy: input.groupBy,
      threshold: input.threshold,
      windowMinutes: input.windowMinutes,
    });
  }

  async setRuleEnabled(
    projectId: string,
    actor: Actor,
    ruleId: string,
    enabled: unknown,
  ) {
    await this.member(projectId, actor, true);
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

  async findings(projectId: string, actor: Actor, input: QueryInput) {
    await this.member(projectId, actor);
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

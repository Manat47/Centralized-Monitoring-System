import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { DRIZZLE_DB } from '../database/database.provider';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../alerting/domain/port/audit-event-publisher.port';
import { logFindingRules } from '../database/schema/log-finding.schema';
import { LogFindingRuleSummaryReader } from './log-finding-rule-summary.reader';
import {
  CreateLogFindingRuleDto,
  UpdateLogFindingRuleDto,
} from './log-finding-rule.dto';

@Controller('log-finding-rules')
export class LogFindingManageController {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
    private readonly summaries: LogFindingRuleSummaryReader,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEvents: AuditEventPublisher,
  ) {}

  private requireGateway(supplied?: string): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_SECRET');
    if (!expected || !supplied) throw new ForbiddenException();
    const actual = Buffer.from(supplied);
    const wanted = Buffer.from(expected);
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted))
      throw new ForbiddenException();
  }

  private validateQuery(query: string): string {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > 256)
      throw new BadRequestException('Query must be 1 to 256 characters');
    if (trimmed.startsWith('regex:')) {
      const pattern = trimmed.slice(6);
      if (!pattern || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern))
        throw new BadRequestException('Invalid regex pattern');
      try {
        new RegExp(pattern, 'i');
      } catch {
        throw new BadRequestException('Invalid regex pattern');
      }
    }
    return trimmed;
  }

  private requireAdminActor(userId?: string, role?: string) {
    if (!userId || !isUUID(userId) || role !== 'ADMIN')
      throw new ForbiddenException('Verified administrator is required');
    return { actorUserId: userId, actorRole: 'ADMIN' as const };
  }

  @Get()
  list(@Headers('x-internal-service-secret') secret?: string) {
    this.requireGateway(secret);
    return this.summaries.list();
  }

  @Post()
  async create(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Body() input: CreateLogFindingRuleDto,
    @Headers('x-user-id') actorUserId?: string,
    @Headers('x-user-role') actorRole?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    this.requireGateway(secret);
    const actor = this.requireAdminActor(actorUserId, actorRole);
    const name = input.name.trim();
    const serviceName = input.serviceName.trim();
    if (!name || !serviceName)
      throw new BadRequestException('Name and service are required');
    const searchQuery = this.validateQuery(input.searchQuery);
    const [created] = await this.db
      .insert(logFindingRules)
      .values({
        id: randomUUID(),
        name,
        serviceName,
        searchQuery,
        severity: input.severity,
        threshold: input.threshold,
        timeWindowSeconds: input.timeWindowSeconds,
        cooldownMinutes: input.cooldownMinutes,
        isEnabled: input.isEnabled ?? true,
      })
      .returning();
    await this.auditEvents.publish({
      ...actor,
      actorEmail,
      action: 'LOG_FINDING_RULE_CREATED',
      resourceType: 'LOG_FINDING_RULE',
      resourceId: created.id,
      resourceName: created.name,
      result: 'SUCCESS',
      metadata: { serviceName: created.serviceName },
      occurredAt: new Date(),
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLogFindingRuleDto,
    @Headers('x-user-id') actorUserId?: string,
    @Headers('x-user-role') actorRole?: string,
    @Headers('x-user-email') actorEmail?: string,
  ) {
    this.requireGateway(secret);
    const actor = this.requireAdminActor(actorUserId, actorRole);
    if (Object.keys(input).length === 0)
      throw new BadRequestException('At least one field is required');
    const name = input.name === undefined ? undefined : input.name.trim();
    const serviceName =
      input.serviceName === undefined ? undefined : input.serviceName.trim();
    if (name === '' || serviceName === '')
      throw new BadRequestException('Name and service are required');
    const [updated] = await this.db
      .update(logFindingRules)
      .set({
        ...(name === undefined ? {} : { name }),
        ...(serviceName === undefined ? {} : { serviceName }),
        ...(input.searchQuery === undefined
          ? {}
          : { searchQuery: this.validateQuery(input.searchQuery) }),
        ...(input.severity === undefined ? {} : { severity: input.severity }),
        ...(input.threshold === undefined
          ? {}
          : { threshold: input.threshold }),
        ...(input.timeWindowSeconds === undefined
          ? {}
          : { timeWindowSeconds: input.timeWindowSeconds }),
        ...(input.cooldownMinutes === undefined
          ? {}
          : { cooldownMinutes: input.cooldownMinutes }),
        ...(input.isEnabled === undefined
          ? {}
          : { isEnabled: input.isEnabled }),
        updatedAt: new Date(),
      })
      .where(eq(logFindingRules.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Rule not found');
    await this.auditEvents.publish({
      ...actor,
      actorEmail,
      action: 'LOG_FINDING_RULE_UPDATED',
      resourceType: 'LOG_FINDING_RULE',
      resourceId: updated.id,
      resourceName: updated.name,
      result: 'SUCCESS',
      metadata: { changedFields: Object.keys(input) },
      occurredAt: new Date(),
    });
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') actorUserId?: string,
    @Headers('x-user-role') actorRole?: string,
    @Headers('x-user-email') actorEmail?: string,
  ): Promise<void> {
    this.requireGateway(secret);
    const actor = this.requireAdminActor(actorUserId, actorRole);
    const [deleted] = await this.db
      .delete(logFindingRules)
      .where(eq(logFindingRules.id, id))
      .returning({ id: logFindingRules.id, name: logFindingRules.name });
    if (!deleted) throw new NotFoundException('Rule not found');
    await this.auditEvents.publish({
      ...actor,
      actorEmail,
      action: 'LOG_FINDING_RULE_DELETED',
      resourceType: 'LOG_FINDING_RULE',
      resourceId: deleted.id,
      resourceName: deleted.name,
      result: 'SUCCESS',
      occurredAt: new Date(),
    });
  }
}

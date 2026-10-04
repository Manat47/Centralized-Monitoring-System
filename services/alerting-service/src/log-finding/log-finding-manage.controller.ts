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
import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { DRIZZLE_DB } from '../database/database.provider';
import { logFindingRules } from '../database/schema/log-finding.schema';
import {
  CreateLogFindingRuleDto,
  UpdateLogFindingRuleDto,
} from './log-finding-rule.dto';

@Controller('log-finding-rules')
export class LogFindingManageController {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
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

  @Get()
  list(@Headers('x-internal-service-secret') secret?: string) {
    this.requireGateway(secret);
    return this.db
      .select()
      .from(logFindingRules)
      .orderBy(asc(logFindingRules.name));
  }

  @Post()
  async create(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Body() input: CreateLogFindingRuleDto,
  ) {
    this.requireGateway(secret);
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
    return created;
  }

  @Patch(':id')
  async update(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLogFindingRuleDto,
  ) {
    this.requireGateway(secret);
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
    return updated;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Headers('x-internal-service-secret') secret: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.requireGateway(secret);
    const [deleted] = await this.db
      .delete(logFindingRules)
      .where(eq(logFindingRules.id, id))
      .returning({ id: logFindingRules.id });
    if (!deleted) throw new NotFoundException('Rule not found');
  }
}

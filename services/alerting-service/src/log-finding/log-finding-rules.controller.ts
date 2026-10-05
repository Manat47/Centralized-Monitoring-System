import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { timingSafeEqual } from 'node:crypto';
import { DRIZZLE_DB } from '../database/database.provider';
import { logFindingRules } from '../database/schema/log-finding.schema';

@Controller('internal/log-finding-rules')
export class LogFindingRulesController {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async listEnabled(@Headers('x-internal-service-secret') supplied?: string) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_SECRET');
    if (!expected || !supplied) throw new ForbiddenException();
    const actual = Buffer.from(supplied);
    const wanted = Buffer.from(expected);
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
      throw new ForbiddenException();
    }
    return this.db
      .select({
        id: logFindingRules.id,
        name: logFindingRules.name,
        serviceName: logFindingRules.serviceName,
        searchQuery: logFindingRules.searchQuery,
        severity: logFindingRules.severity,
        threshold: logFindingRules.threshold,
        timeWindowSeconds: logFindingRules.timeWindowSeconds,
        cooldownMinutes: logFindingRules.cooldownMinutes,
      })
      .from(logFindingRules)
      .where(eq(logFindingRules.isEnabled, true));
  }
}

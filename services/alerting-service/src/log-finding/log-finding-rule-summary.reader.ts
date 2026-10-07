import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, getTableColumns, max } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../database/database.provider';
import {
  logFindingRules,
  logFindingStates,
} from '../database/schema/log-finding.schema';

@Injectable()
export class LogFindingRuleSummaryReader {
  constructor(@Inject(DRIZZLE_DB) private readonly db: NodePgDatabase) {}

  list() {
    return this.db
      .select({
        ...getTableColumns(logFindingRules),
        lastTriggeredAt: max(logFindingStates.lastTriggeredAt),
        triggeredFingerprintCount: count(logFindingStates.fingerprint),
      })
      .from(logFindingRules)
      .leftJoin(
        logFindingStates,
        eq(logFindingStates.ruleId, logFindingRules.id),
      )
      .groupBy(logFindingRules.id)
      .orderBy(asc(logFindingRules.name));
  }
}

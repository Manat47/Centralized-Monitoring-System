import { Inject, Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import {
  healthCheckAlertStates,
  type HealthCheckAlertStateRow,
} from '../../../database/schema/alerts.schema';
import {
  HealthCheckAlertState,
  type HealthCheckEvaluationStatus,
} from '../../domain/entities/health-check-alert-state.entity';
import type { HealthCheckAlertStateRepository } from '../../domain/repositories/health-check-alert-state.repository';
import * as schema from '../../../database/schema/alerts.schema';

@Injectable()
export class DrizzleHealthCheckAlertStateRepository
  implements HealthCheckAlertStateRepository
{
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByTargetId(
    targetId: string,
  ): Promise<HealthCheckAlertState | null> {
    const [row] = await this.db
      .select()
      .from(healthCheckAlertStates)
      .where(eq(healthCheckAlertStates.healthCheckTargetId, targetId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findStaleCandidates(now: Date): Promise<HealthCheckAlertState[]> {
    const rows = await this.db
      .select()
      .from(healthCheckAlertStates)
      .where(lt(healthCheckAlertStates.lastResultAt, now));

    return rows.map((row) => this.toDomain(row));
  }

  async save(
    state: HealthCheckAlertState,
  ): Promise<HealthCheckAlertState> {
    const data = state.toObject();

    const [row] = await this.db
      .insert(healthCheckAlertStates)
      .values(data)
      .onConflictDoUpdate({
        target: healthCheckAlertStates.healthCheckTargetId,
        set: {
          assetId: data.assetId,
          url: data.url,
          enabled: data.enabled,
          archived: data.archived,
          state: data.state,
          checkIntervalSeconds: data.checkIntervalSeconds,
          consecutiveFailures: data.consecutiveFailures,
          consecutiveSuccesses: data.consecutiveSuccesses,
          lastResultAt: data.lastResultAt,
          lastStatusCode: data.lastStatusCode,
          lastResponseTimeMs: data.lastResponseTimeMs,
          lastError: data.lastError,
          staleAlertedAt: data.staleAlertedAt,
          updatedAt: data.updatedAt,
        },
      })
      .returning();

    return this.toDomain(row);
  }

  private toDomain(row: HealthCheckAlertStateRow): HealthCheckAlertState {
    return HealthCheckAlertState.restore({
      ...row,
      state: row.state as HealthCheckEvaluationStatus,
    });
  }
}

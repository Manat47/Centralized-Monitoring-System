import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/monitoring-targets.schema';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';
import type { HealthCheckTargetRepository } from '../../domain/repositories/health-check-target.repository';

type HealthCheckTargetRow = typeof schema.healthCheckTargets.$inferSelect;

@Injectable()
export class DrizzleHealthCheckTargetRepository implements HealthCheckTargetRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(target: HealthCheckTarget): Promise<HealthCheckTarget> {
    const data = target.toObject();

    const [row] = await this.db
      .insert(schema.healthCheckTargets)
      .values({
        healthCheckTargetId: data.healthCheckTargetId,
        assetId: data.assetId,
        url: data.url,
        checkIntervalSeconds: data.checkIntervalSeconds,
        enabled: data.enabled,
        archivedAt: data.archivedAt,
        lastCheckedAt: data.lastCheckedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    return this.toDomain(row);
  }

  async findById(
    healthCheckTargetId: string,
  ): Promise<HealthCheckTarget | null> {
    const [row] = await this.db
      .select()
      .from(schema.healthCheckTargets)
      .where(
        eq(schema.healthCheckTargets.healthCheckTargetId, healthCheckTargetId),
      )
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<HealthCheckTarget[]> {
    const rows = await this.db.select().from(schema.healthCheckTargets);

    return rows.map((row) => this.toDomain(row));
  }

  async findAllByAssetId(assetId: string): Promise<HealthCheckTarget[]> {
    const rows = await this.db
      .select()
      .from(schema.healthCheckTargets)
      .where(eq(schema.healthCheckTargets.assetId, assetId));

    return rows.map((row) => this.toDomain(row));
  }

  async findActiveByAssetIdAndUrl(
    assetId: string,
    url: string,
  ): Promise<HealthCheckTarget | null> {
    const [row] = await this.db
      .select()
      .from(schema.healthCheckTargets)
      .where(
        and(
          eq(schema.healthCheckTargets.assetId, assetId),
          eq(schema.healthCheckTargets.url, url),
          isNull(schema.healthCheckTargets.archivedAt),
        ),
      )
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findEnabled(): Promise<HealthCheckTarget[]> {
    const rows = await this.db
      .select()
      .from(schema.healthCheckTargets)
      .where(
        and(
          eq(schema.healthCheckTargets.enabled, true),
          isNull(schema.healthCheckTargets.archivedAt),
        ),
      );

    return rows.map((row) => this.toDomain(row));
  }

  async update(target: HealthCheckTarget): Promise<HealthCheckTarget> {
    const data = target.toObject();

    const [row] = await this.db
      .update(schema.healthCheckTargets)
      .set({
        url: data.url,
        checkIntervalSeconds: data.checkIntervalSeconds,
        enabled: data.enabled,
        archivedAt: data.archivedAt,
        lastCheckedAt: data.lastCheckedAt,
        updatedAt: data.updatedAt,
      })
      .where(
        eq(
          schema.healthCheckTargets.healthCheckTargetId,
          data.healthCheckTargetId,
        ),
      )
      .returning();

    return this.toDomain(row);
  }

  private toDomain(row: HealthCheckTargetRow): HealthCheckTarget {
    return HealthCheckTarget.restore({
      healthCheckTargetId: row.healthCheckTargetId,
      assetId: row.assetId,
      url: row.url,
      checkIntervalSeconds: row.checkIntervalSeconds,
      enabled: row.enabled,
      archivedAt: row.archivedAt,
      lastCheckedAt: row.lastCheckedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

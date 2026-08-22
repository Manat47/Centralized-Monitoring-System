import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/monitoring-targets.schema';
import {
  MonitoringTarget,
  type MonitoringType,
} from '../../domain/entities/monitoring-target.entity';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';

type MonitoringTargetRow = typeof schema.monitoringTargets.$inferSelect;

@Injectable()
export class DrizzleMonitoringTargetRepository implements MonitoringTargetRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(target: MonitoringTarget): Promise<MonitoringTarget> {
    const data = target.toObject();

    const [row] = await this.db
      .insert(schema.monitoringTargets)
      .values({
        targetId: data.targetId,
        assetId: data.assetId,
        monitoringType: data.monitoringType,
        protocol: data.protocol,
        port: data.port,
        path: data.path,
        scrapeIntervalSeconds: data.scrapeIntervalSeconds,
        verificationStatus: data.verificationStatus,
        monitoringEnabled: data.monitoringEnabled,
        lastVerifiedAt: data.lastVerifiedAt,
        lastCollectedAt: data.lastCollectedAt,
        lastError: data.lastError,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    return this.toDomain(row);
  }

  async findAll(): Promise<MonitoringTarget[]> {
    const rows = await this.db.select().from(schema.monitoringTargets);

    return rows.map((row) => this.toDomain(row));
  }

  async findById(targetId: string): Promise<MonitoringTarget | null> {
    const [row] = await this.db
      .select()
      .from(schema.monitoringTargets)
      .where(eq(schema.monitoringTargets.targetId, targetId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findAllByAssetId(assetId: string): Promise<MonitoringTarget[]> {
    const rows = await this.db
      .select()
      .from(schema.monitoringTargets)
      .where(eq(schema.monitoringTargets.assetId, assetId));

    return rows.map((row) => this.toDomain(row));
  }

  async findByAssetIdAndMonitoringType(
    assetId: string,
    monitoringType: MonitoringType,
  ): Promise<MonitoringTarget | null> {
    const [row] = await this.db
      .select()
      .from(schema.monitoringTargets)
      .where(
        and(
          eq(schema.monitoringTargets.assetId, assetId),
          eq(schema.monitoringTargets.monitoringType, monitoringType),
        ),
      )
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findEnabled(): Promise<MonitoringTarget[]> {
    const rows = await this.db
      .select()
      .from(schema.monitoringTargets)
      .where(eq(schema.monitoringTargets.monitoringEnabled, true));

    return rows.map((row) => this.toDomain(row));
  }

  async update(target: MonitoringTarget): Promise<MonitoringTarget> {
    const data = target.toObject();

    const [row] = await this.db
      .update(schema.monitoringTargets)
      .set({
        protocol: data.protocol,
        port: data.port,
        path: data.path,
        scrapeIntervalSeconds: data.scrapeIntervalSeconds,
        verificationStatus: data.verificationStatus,
        monitoringEnabled: data.monitoringEnabled,
        lastVerifiedAt: data.lastVerifiedAt,
        lastCollectedAt: data.lastCollectedAt,
        lastError: data.lastError,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.monitoringTargets.targetId, data.targetId))
      .returning();

    return this.toDomain(row);
  }

  private toDomain(row: MonitoringTargetRow): MonitoringTarget {
    return MonitoringTarget.restore({
      targetId: row.targetId,
      assetId: row.assetId,
      monitoringType: row.monitoringType,
      protocol: row.protocol,
      port: row.port,
      path: row.path,
      scrapeIntervalSeconds: row.scrapeIntervalSeconds,
      verificationStatus: row.verificationStatus,
      monitoringEnabled: row.monitoringEnabled,
      lastVerifiedAt: row.lastVerifiedAt,
      lastCollectedAt: row.lastCollectedAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

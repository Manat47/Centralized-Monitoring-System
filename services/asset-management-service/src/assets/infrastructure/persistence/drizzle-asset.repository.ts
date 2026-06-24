import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/assets.schema';
import {
  AssetProps,
  CreateAssetProps,
  AssetStatus,
} from '../../domain/entities/asset.entity';
import { Asset } from '../../domain/entities/asset.entity';
import { AssetRepository } from '../../domain/repositories/asset.repository';

@Injectable()
export class DrizzleAssetRepository implements AssetRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: CreateAssetProps): Promise<Asset> {
    const [row] = await this.db
      .insert(schema.assets)
      .values({
        name: data.name,
        targetType: data.targetType,
        ipAddress: data.ipAddress,
        endpoint: data.endpoint,
        environment: data.environment,
      })
      .returning();

    return this.toDomain(row);
  }

  async findAll(): Promise<Asset[]> {
    const rows = await this.db.select().from(schema.assets);

    return rows.map((row) => this.toDomain(row));
  }

  async findById(assetId: string): Promise<Asset | null> {
    const [row] = await this.db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.assetId, assetId))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async update(asset: Asset): Promise<Asset> {
    const data = asset.toObject();

    const [row] = await this.db
      .update(schema.assets)
      .set({
        name: data.name,
        hostname: data.hostname,
        targetType: data.targetType,
        ipAddress: data.ipAddress,
        endpoint: data.endpoint,
        environment: data.environment,
        status: data.status,
        monitoringEnable: data.monitoringEnable,
        updatedAt: data.updatedAt,
      })
      .where(eq(schema.assets.assetId, data.assetId))
      .returning();

    return this.toDomain(row);
  }

  async updateStatus(assetId: string, status: AssetStatus): Promise<Asset> {
    const [row] = await this.db
      .update(schema.assets)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.assets.assetId, assetId))
      .returning();

    return this.toDomain(row);
  }

  async updateMonitoringStatus(
    assetId: string,
    enabled: boolean,
  ): Promise<Asset> {
    const [row] = await this.db
      .update(schema.assets)
      .set({
        monitoringEnable: enabled,
        updatedAt: new Date(),
      })
      .where(eq(schema.assets.assetId, assetId))
      .returning();

    return this.toDomain(row);
  }
  private toDomain(row: AssetProps): Asset {
    return Asset.restore(row);
  }
}

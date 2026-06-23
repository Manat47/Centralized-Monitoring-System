import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql, eq } from 'drizzle-orm';

import { DRIZZLE_DB } from '../database/database.provider';
import * as schema from '../database/schema/assets.schema';
import { CreateAssetDto, TargetType } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

@Injectable()
export class AssetsService implements OnModuleInit {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onModuleInit() {
    this.logger.log('Testing PostgreSQL connection...');
    await this.db.execute(sql`select 1`);

    this.logger.log('PostgreSQL connection successful');
  }
  async create(dto: CreateAssetDto) {
    if (dto.targetType === TargetType.SERVER && !dto.ipAddress) {
      throw new BadRequestException('ipAddress is required for SERVER target');
    }

    if (
      (dto.targetType === TargetType.APPLICATION ||
        dto.targetType === TargetType.SERVICE) &&
      !dto.endpoint
    ) {
      throw new BadRequestException(
        'endpoint is required for APPLICATION or SERVICE target',
      );
    }

    const [createdAsset] = await this.db
      .insert(schema.assets)
      .values({
        name: dto.name,
        targetType: dto.targetType,
        ipAddress: dto.ipAddress,
        endpoint: dto.endpoint,
        environment: dto.environment,
      })
      .returning();

    return createdAsset;
  }
  async findAll() {
    return this.db.select().from(schema.assets);
  }
  async findOne(assetId: string) {
    this.logger.log(`Searching assetId: [${assetId}]`);
    const [asset] = await this.db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.assetId, assetId))
      .limit(1);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    return asset;
  }

  async update(assetId: string, dto: UpdateAssetDto) {
    const currentAsset = await this.findOne(assetId);

    const targetType = dto.targetType ?? currentAsset.targetType;
    const ipAddress = dto.ipAddress ?? currentAsset.ipAddress;
    const endpoint = dto.endpoint ?? currentAsset.endpoint;

    if (targetType === TargetType.SERVER && !ipAddress) {
      throw new BadRequestException('ipAddress is required for SERVER target');
    }

    if (
      (targetType === TargetType.APPLICATION ||
        targetType === TargetType.SERVICE) &&
      !endpoint
    ) {
      throw new BadRequestException(
        'endpoint is required for APPLICATION or SERVICE target',
      );
    }
    const [UpdateAsset] = await this.db
      .update(schema.assets)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.assets.assetId, assetId))
      .returning();

    return UpdateAsset;
  }
  async updateStatus(assetId: string, dto: UpdateAssetStatusDto) {
    await this.findOne(assetId);

    const [updateStatus] = await this.db
      .update(schema.assets)
      .set({
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.assets.assetId, assetId))
      .returning();

    return updateStatus;
  }

  async deactivate(assetId: string) {
    const currentAsset = await this.findOne(assetId);

    if (currentAsset.status === 'DEACTIVATE') {
      throw new BadRequestException('Asset is already deactiveted');
    }
    const [deactivateAsset] = await this.db
      .update(schema.assets)
      .set({
        status: 'DEACTIVATE',
        updatedAt: new Date(),
      })
      .where(eq(schema.assets.assetId, assetId))
      .returning();

    return deactivateAsset;
  }
}

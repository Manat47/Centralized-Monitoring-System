import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MonitoringTarget,
  type CreateMonitoringTargetProps,
} from '../../domain/entities/monitoring-target.entity';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

export interface CreateMonitoringTargetInput {
  assetId: string;
  port?: number;
  path?: string;
  scrapeIntervalSeconds?: number;
}

@Injectable()
export class CreateMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(input: CreateMonitoringTargetInput): Promise<MonitoringTarget> {
    const existingTarget = await this.monitoringTargetRepository.findByAssetId(
      input.assetId,
    );

    if (existingTarget) {
      throw new ConflictException(
        `Monitoring target for asset ${input.assetId} already exists`,
      );
    }

    const asset = await this.assetReader.findById(input.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    if (asset.assetType !== 'SERVER') {
      throw new BadRequestException(
        'Only SERVER assets can be monitored with Node Exporter',
      );
    }

    if (asset.status !== 'ACTIVATE') {
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    const host = asset.hostname?.trim() || asset.ipAddress?.trim();

    if (!host) {
      throw new BadRequestException(
        'Asset does not have a hostname or IP address',
      );
    }

    const createProps: CreateMonitoringTargetProps = {
      assetId: asset.assetId,
      host,
      port: input.port,
      path: input.path,
      scrapeIntervalSeconds: input.scrapeIntervalSeconds,
    };

    const target = MonitoringTarget.create(randomUUID(), createProps);

    return this.monitoringTargetRepository.create(target);
  }
}

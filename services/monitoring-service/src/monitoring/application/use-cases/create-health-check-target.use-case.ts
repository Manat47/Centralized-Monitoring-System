import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  HealthCheckTarget,
  type CreateHealthCheckTargetProps,
} from '../../domain/entities/health-check-target.entity';

import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

export interface CreateHealthCheckTargetInput {
  assetId: string;
  url: string;
  checkIntervalSeconds?: number;
}

@Injectable()
export class CreateHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(
    input: CreateHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const asset = await this.assetReader.findById(input.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    if (asset.status !== 'ACTIVATE') {
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    const createProps: CreateHealthCheckTargetProps = {
      assetId: asset.assetId,
      url: input.url,
      checkIntervalSeconds: input.checkIntervalSeconds,
    };

    const target = HealthCheckTarget.create(randomUUID(), createProps);

    return this.healthCheckTargetRepository.create(target);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';
import {
  HEALTH_CHECKER,
  type HealthChecker,
  type HealthCheckResult,
} from '../../domain/ports/health-checker.port';
import {
  HEALTH_CHECK_STORAGE,
  type HealthCheckStorage,
} from '../../domain/ports/health-check-storage.port';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';

import { AssetNotOperationalException } from '../errors/asset-not-operational.exception';

@Injectable()
export class CheckHealthTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: HealthChecker,

    @Inject(HEALTH_CHECK_STORAGE)
    private readonly healthCheckStorage: HealthCheckStorage,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(healthCheckTargetId: string): Promise<HealthCheckResult> {
    const target =
      await this.healthCheckTargetRepository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    const data = target.toObject();

    const asset = await this.assetReader.findById(data.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${data.assetId} not found`);
    }

    if (asset.status !== 'ACTIVATE') {
      throw new AssetNotOperationalException(asset.assetId, asset.status);
    }

    const result = await this.healthChecker.check(data.url);

    await this.healthCheckStorage.writeResult({
      healthCheckTargetId: data.healthCheckTargetId,
      assetId: data.assetId,
      result,
    });

    target.markChecked(result.checkedAt);

    await this.healthCheckTargetRepository.update(target);

    return result;
  }
}

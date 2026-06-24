import { Inject, Injectable } from '@nestjs/common';

import {
  Asset,
  type CreateAssetProps,
} from '../../domain/entities/asset.entity';
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';

@Injectable()
export class CreateAssetUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(input: CreateAssetProps): Promise<Asset> {
    Asset.validateTarget(input.targetType, input.ipAddress, input.endpoint);

    return this.assetRepository.create(input);
  }
}

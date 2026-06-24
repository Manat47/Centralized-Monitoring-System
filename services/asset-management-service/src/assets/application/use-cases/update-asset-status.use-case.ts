import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Asset, type AssetStatus } from '../../domain/entities/asset.entity';
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';

@Injectable()
export class UpdateAssetStatusUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async execute(assetId: string, status: AssetStatus): Promise<Asset> {
    const asset = await this.assetRepository.findById(assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    asset.changeStatus(status);

    return this.assetRepository.update(asset);
  }
}

import { Inject, Injectable } from '@nestjs/common';

import { Asset } from '../../domain/entities/asset.entity';
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from '../../domain/repositories/asset.repository';

@Injectable()
export class FindAllAssetsUseCase {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  execute(): Promise<Asset[]> {
    console.log('FindAllAssetsUseCase called');

    return this.assetRepository.findAll();
  }
}

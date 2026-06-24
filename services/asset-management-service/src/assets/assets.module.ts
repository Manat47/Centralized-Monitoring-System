import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CreateAssetUseCase } from './application/use-cases/create-asset.use-case';
import { ASSET_REPOSITORY } from './domain/repositories/asset.repository';
import { DrizzleAssetRepository } from './infrastructure/persistence/drizzle-asset.repository';
import { AssetsController } from './assets.controller';
import { FindAllAssetsUseCase } from './application/use-cases/find-all-assets.use-case';
import { FindAssetByIdUseCase } from './application/use-cases/find-asset-by-id.use-case';
import { UpdateAssetUseCase } from './application/use-cases/update-asset.use-case';
import { UpdateAssetStatusUseCase } from './application/use-cases/update-asset-status.use-case';
import { DeactivateAssetUseCase } from './application/use-cases/deactivate-asset.use-case';

@Module({
  imports: [DatabaseModule],

  controllers: [AssetsController],

  providers: [
    CreateAssetUseCase,
    FindAllAssetsUseCase,
    FindAssetByIdUseCase,
    UpdateAssetUseCase,
    UpdateAssetStatusUseCase,
    DeactivateAssetUseCase,
    {
      provide: ASSET_REPOSITORY,
      useClass: DrizzleAssetRepository,
    },
  ],
})
export class AssetsModule {}

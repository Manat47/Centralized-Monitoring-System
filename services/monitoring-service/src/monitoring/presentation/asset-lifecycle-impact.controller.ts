import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { QueryAssetLifecycleImpactUseCase } from '../application/use-cases/query-asset-lifecycle-impact.use-case';

@Controller('asset-lifecycle-impact')
export class AssetLifecycleImpactController {
  constructor(
    private readonly queryAssetLifecycleImpactUseCase: QueryAssetLifecycleImpactUseCase,
  ) {}

  @Get(':assetId')
  getImpact(@Param('assetId', new ParseUUIDPipe()) assetId: string) {
    return this.queryAssetLifecycleImpactUseCase.execute(assetId);
  }
}

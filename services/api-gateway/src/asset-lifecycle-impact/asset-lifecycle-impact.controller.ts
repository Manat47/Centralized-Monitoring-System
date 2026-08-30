import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';

import { AssetLifecycleImpactService } from './asset-lifecycle-impact.service';

@Controller('asset-lifecycle-impact')
export class AssetLifecycleImpactController {
  constructor(
    private readonly assetLifecycleImpactService: AssetLifecycleImpactService,
  ) {}

  @Get(':assetId')
  getImpact(
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Query('action') action = '',
  ) {
    return this.assetLifecycleImpactService.getImpact(assetId, action);
  }
}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AssetLifecycleImpactController } from './asset-lifecycle-impact.controller';
import { AssetLifecycleImpactService } from './asset-lifecycle-impact.service';

@Module({
  imports: [HttpModule],
  controllers: [AssetLifecycleImpactController],
  providers: [AssetLifecycleImpactService],
})
export class AssetLifecycleImpactModule {}

import { IsIn } from 'class-validator';

import {
  ASSET_STATUSES,
  type AssetStatus,
} from '../domain/entities/asset.entity';

export class UpdateAssetStatusDto {
  @IsIn(ASSET_STATUSES)
  status!: AssetStatus;
}

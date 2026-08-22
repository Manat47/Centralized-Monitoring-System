import { IsIn } from 'class-validator';

import {
  ASSET_OPERATIONAL_STATUSES,
  type AssetOperationalStatus,
} from '../domain/entities/asset.entity';

export class UpdateAssetStatusDto {
  @IsIn(ASSET_OPERATIONAL_STATUSES)
  status!: AssetOperationalStatus;
}

import { IsEnum } from 'class-validator';
export enum AssetStatus {
  ACTIVATE = 'ACTIVATE',
  INACTIVATE = 'INACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
}

export class UpdateAssetStatusDto {
  @IsEnum(AssetStatus)
  status!: AssetStatus;
}

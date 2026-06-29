import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
export class CreateMonitoringTargetDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  scrapeIntervalSeconds?: number;
}

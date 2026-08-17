import { IsInt, IsOptional, IsUrl, IsUUID, Min } from 'class-validator';

export class CreateHealthCheckTargetDto {
  @IsUUID()
  assetId!: string;

  @IsUrl({
    require_tld: false,
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  checkIntervalSeconds?: number;
}

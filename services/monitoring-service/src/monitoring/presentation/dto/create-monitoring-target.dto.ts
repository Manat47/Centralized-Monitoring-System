import {
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type {
  MonitoringAddressSource,
  MonitoringProtocol,
} from '../../domain/entities/monitoring-target.entity';

export class CreateMonitoringTargetDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsIn(['HOSTNAME', 'IP_ADDRESS'])
  addressSource?: MonitoringAddressSource;

  @IsOptional()
  @IsIn(['HTTP', 'HTTPS'])
  protocol?: MonitoringProtocol;

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

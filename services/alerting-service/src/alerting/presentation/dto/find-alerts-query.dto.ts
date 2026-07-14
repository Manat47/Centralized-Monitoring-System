import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import type {
  AlertSeverity,
  AlertStatus,
} from '../../domain/entities/alert.entity';
import { Type } from 'class-transformer';
const ALERT_STATUSES: AlertStatus[] = [
  'TRIGGERED',
  'ACKNOWLEDGED',
  'RESOLVED',
  'CLOSED',
];

const ALERT_SEVERITIES: AlertSeverity[] = ['WARNING', 'CRITICAL'];

export class FindAlertsQueryDto {
  @IsOptional()
  @IsIn(ALERT_STATUSES)
  status?: AlertStatus;

  @IsOptional()
  @IsIn(ALERT_SEVERITIES)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

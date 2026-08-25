import {
  IsDateString,
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
const ALERT_SOURCE_TYPES = ['METRIC_RULE', 'HEALTH_CHECK'] as const;
const ALERT_TYPES = [
  'METRIC_THRESHOLD',
  'ENDPOINT_UNAVAILABLE',
  'HEALTH_CHECK_STALE',
] as const;

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
  @IsIn(ALERT_SOURCE_TYPES)
  sourceType?: 'METRIC_RULE' | 'HEALTH_CHECK';

  @IsOptional()
  @IsIn(ALERT_TYPES)
  alertType?:
    | 'METRIC_THRESHOLD'
    | 'ENDPOINT_UNAVAILABLE'
    | 'HEALTH_CHECK_STALE';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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

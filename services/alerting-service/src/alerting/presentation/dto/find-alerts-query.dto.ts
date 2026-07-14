import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

import type {
  AlertSeverity,
  AlertStatus,
} from '../../domain/entities/alert.entity';

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
}

import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const ACTOR_ROLES = ['ADMIN', 'OPERATOR'] as const;

const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_STATUS_CHANGED',
  'ASSET_CREATED',
  'ASSET_UPDATED',
  'ASSET_STATUS_CHANGED',
  'ASSET_DEACTIVATED',
  'MONITORING_TARGET_CREATED',
  'MONITORING_TARGET_VERIFIED',
  'MONITORING_TARGET_ENABLED',
  'MONITORING_TARGET_DISABLED',
  'METRIC_RULE_CREATED',
  'ALERT_ACKNOWLEDGED',
  'ALERT_CLOSED',
] as const;

const RESOURCE_TYPES = [
  'USER',
  'ASSET',
  'MONITORING_TARGET',
  'METRIC_RULE',
  'ALERT',
] as const;

const AUDIT_RESULTS = ['SUCCESS', 'FAILURE'] as const;

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsIn(ACTOR_ROLES)
  actorRole?: (typeof ACTOR_ROLES)[number];

  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: (typeof AUDIT_ACTIONS)[number];

  @IsOptional()
  @IsIn(RESOURCE_TYPES)
  resourceType?: (typeof RESOURCE_TYPES)[number];

  @IsOptional()
  @IsIn(AUDIT_RESULTS)
  result?: (typeof AUDIT_RESULTS)[number];

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESULTS,
} from '../../domain/entities/audit-log.entity';

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsIn(AUDIT_ACTOR_ROLES)
  actorRole?: (typeof AUDIT_ACTOR_ROLES)[number];

  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: (typeof AUDIT_ACTIONS)[number];

  @IsOptional()
  @IsIn(AUDIT_RESOURCE_TYPES)
  resourceType?: (typeof AUDIT_RESOURCE_TYPES)[number];

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

import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESULTS,
} from '../../../domain/entities/audit-log.entity';

export class AuditEventDto {
  @IsUUID()
  eventId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  schemaVersion!: number;

  @IsUUID()
  actorUserId!: string;

  @IsIn(AUDIT_ACTOR_ROLES)
  actorRole!: (typeof AUDIT_ACTOR_ROLES)[number];

  @IsOptional()
  @IsEmail()
  actorEmail?: string | null;

  @IsIn(AUDIT_ACTIONS)
  action!: (typeof AUDIT_ACTIONS)[number];

  @IsIn(AUDIT_RESOURCE_TYPES)
  resourceType!: (typeof AUDIT_RESOURCE_TYPES)[number];

  @IsOptional()
  @IsUUID()
  resourceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  resourceName?: string | null;

  @IsIn(AUDIT_RESULTS)
  result!: (typeof AUDIT_RESULTS)[number];

  @IsString()
  @MaxLength(100)
  sourceService!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  requestId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string | null;

  @IsISO8601()
  occurredAt!: string;
}

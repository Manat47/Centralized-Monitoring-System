import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';

import {
  AuditLog,
  type AuditAction,
  type AuditActorRole,
  type AuditMetadata,
  type AuditResourceType,
  type AuditResult,
} from '../../domain/entities/audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from '../../domain/repositories/audit-log.repository';

export interface RecordAuditLogInput {
  eventId: string;
  schemaVersion?: number;
  actorUserId: string;
  actorRole: AuditActorRole;
  actorEmail?: string | null;

  action: AuditAction;

  resourceType: AuditResourceType;
  resourceId?: string | null;
  resourceName?: string | null;

  result: AuditResult;
  sourceService: string;
  requestId?: string | null;
  metadata?: AuditMetadata | null;
  errorCode?: string | null;
  errorMessage?: string | null;

  occurredAt?: Date;
}

@Injectable()
export class RecordAuditLogUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordAuditLogInput): Promise<void> {
    const auditLog = AuditLog.create(randomUUID(), {
      eventId: input.eventId,
      schemaVersion: input.schemaVersion,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      result: input.result,
      sourceService: input.sourceService,
      requestId: input.requestId,
      metadata: input.metadata,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      occurredAt: input.occurredAt ?? new Date(),
    });

    await this.auditLogRepository.create(auditLog);
  }
}

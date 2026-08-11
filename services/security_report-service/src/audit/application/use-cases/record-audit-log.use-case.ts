import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';

import {
  AuditLog,
  type AuditAction,
  type AuditActorRole,
  type AuditResourceType,
  type AuditResult,
} from '../../domain/entities/audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from '../../domain/repositories/audit-log.repository';

export interface RecordAuditLogInput {
  actorUserId: string;
  actorRole: AuditActorRole;

  action: AuditAction;

  resourceType: AuditResourceType;
  resourceId: string;

  result: AuditResult;

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
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      result: input.result,
      occurredAt: input.occurredAt ?? new Date(),
    });

    await this.auditLogRepository.create(auditLog);
  }
}

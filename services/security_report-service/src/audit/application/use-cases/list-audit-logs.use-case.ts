import { Inject, Injectable } from '@nestjs/common';

import type {
  AuditAction,
  AuditActorRole,
  AuditResourceType,
  AuditResult,
} from '../../domain/entities/audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from '../../domain/repositories/audit-log.repository';

export interface ListAuditLogsInput {
  actorUserId?: string;
  actorRole?: AuditActorRole;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ListAuditLogsInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const result = await this.auditLogRepository.findMany({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      result: input.result,
      from: input.from,
      to: input.to,
      page,
      limit,
    });

    return {
      items: result.items.map((auditLog) => auditLog.toObject()),
      total: result.total,
      page,
      limit,
    };
  }
}

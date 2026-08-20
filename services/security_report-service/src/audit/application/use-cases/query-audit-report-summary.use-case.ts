import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from '../../domain/repositories/audit-log.repository';

export interface QueryAuditReportSummaryInput {
  from: Date;
  to: Date;
}

export interface AuditReportSummary {
  totalActions: number;

  result: {
    success: number;
    failure: number;
  };

  actorRoles: Record<string, number>;

  actions: Record<string, number>;

  resources: Record<string, number>;
}

@Injectable()
export class QueryAuditReportSummaryUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(
    input: QueryAuditReportSummaryInput,
  ): Promise<AuditReportSummary> {
    if (input.from >= input.to) {
      throw new BadRequestException(
        'Report start time must be before end time',
      );
    }

    const logs = await this.auditLogRepository.findForReport({
      from: input.from,
      to: input.to,
    });

    const result = {
      success: 0,
      failure: 0,
    };

    const actorRoles: Record<string, number> = {};
    const actions: Record<string, number> = {};
    const resources: Record<string, number> = {};

    for (const log of logs) {
      const data = log.toObject();

      if (data.result === 'SUCCESS') {
        result.success += 1;
      } else {
        result.failure += 1;
      }

      actorRoles[data.actorRole] = (actorRoles[data.actorRole] ?? 0) + 1;

      actions[data.action] = (actions[data.action] ?? 0) + 1;

      resources[data.resourceType] = (resources[data.resourceType] ?? 0) + 1;
    }

    return {
      totalActions: logs.length,
      result,
      actorRoles,
      actions,
      resources,
    };
  }
}

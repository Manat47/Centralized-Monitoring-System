import { Controller, Get, Query } from '@nestjs/common';

import { ListAuditLogsUseCase } from '../../application/use-cases/list-audit-logs.use-case';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  @Get()
  async listAuditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.listAuditLogsUseCase.execute({
      actorUserId: query.actorUserId,
      actorRole: query.actorRole,
      action: query.action,
      resourceType: query.resourceType,
      result: query.result,

      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,

      page: query.page,
      limit: query.limit,
    });
  }
}

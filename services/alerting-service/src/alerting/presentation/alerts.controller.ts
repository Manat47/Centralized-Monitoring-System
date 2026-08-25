import { Controller, Get, Param, Patch, Query, Headers } from '@nestjs/common';

import { FindAlertsUseCase } from '../application/use-cases/find-alerts.use-case';
import { FindAlertByIdUseCase } from '../application/use-cases/find-alert-by-id.use-case';
import { AcknowledgeAlertUseCase } from '../application/use-cases/acknowledge-alert.use-case';
import { CloseAlertUseCase } from '../application/use-cases/close-alert.use-case';
import { FindAlertsQueryDto } from './dto/find-alerts-query.dto';
import { QueryAlertReportSummaryUseCase } from '../application/use-cases/query-alert-report-summary.use-case';
import { QueryAlertReportSummaryDto } from './dto/query-alert-report-summary.dto';
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly findAlertsUseCase: FindAlertsUseCase,
    private readonly findAlertByIdUseCase: FindAlertByIdUseCase,
    private readonly acknowledgeAlertUseCase: AcknowledgeAlertUseCase,
    private readonly closeAlertUseCase: CloseAlertUseCase,
    private readonly queryAlertReportSummaryUseCase: QueryAlertReportSummaryUseCase,
  ) {}

  @Get()
  async findAll(@Query() query: FindAlertsQueryDto) {
    return this.findAlertsUseCase.execute({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get('report-summary')
  async getReportSummary(@Query() query: QueryAlertReportSummaryDto) {
    return this.queryAlertReportSummaryUseCase.execute({
      assetId: query.assetId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.findAlertByIdUseCase.execute(id);
  }

  @Patch(':id/acknowledge')
  async acknowledge(
    @Param('id') alertId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.acknowledgeAlertUseCase.execute(alertId, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Patch(':id/close')
  async close(
    @Param('id') alertId: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.closeAlertUseCase.execute(alertId, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }
}

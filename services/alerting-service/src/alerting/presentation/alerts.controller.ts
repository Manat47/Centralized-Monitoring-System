import { Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { FindAlertsUseCase } from '../application/use-cases/find-alerts.use-case';
import { FindAlertByIdUseCase } from '../application/use-cases/find-alert-by-id.use-case';
import { AcknowledgeAlertUseCase } from '../application/use-cases/acknowledge-alert.use-case';
import { CloseAlertUseCase } from '../application/use-cases/close-alert.use-case';
import { FindAlertsQueryDto } from './dto/find-alerts-query.dto';
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly findAlertsUseCase: FindAlertsUseCase,
    private readonly findAlertByIdUseCase: FindAlertByIdUseCase,
    private readonly acknowledgeAlertUseCase: AcknowledgeAlertUseCase,
    private readonly closeAlertUseCase: CloseAlertUseCase,
  ) {}

  @Get()
  async findAll(@Query() query: FindAlertsQueryDto) {
    return this.findAlertsUseCase.execute(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.findAlertByIdUseCase.execute(id);
  }

  @Patch(':id/acknowledge')
  async acknowledge(@Param('id') alertId: string) {
    return this.acknowledgeAlertUseCase.execute(alertId);
  }

  @Patch(':id/close')
  async close(@Param('id') alertId: string) {
    return this.closeAlertUseCase.execute(alertId);
  }
}

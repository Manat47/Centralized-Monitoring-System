import { Controller, Get, Param } from '@nestjs/common';

import { FindAlertsUseCase } from '../application/use-cases/find-alerts.use-case';
import { FindAlertByIdUseCase } from '../application/use-cases/find-alert-by-id.use-case';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly findAlertsUseCase: FindAlertsUseCase,
    private readonly findAlertByIdUseCase: FindAlertByIdUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.findAlertsUseCase.execute();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.findAlertByIdUseCase.execute(id);
  }
}

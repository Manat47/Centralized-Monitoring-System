import { Body, Controller, Post } from '@nestjs/common';

import type { AlertEvent } from '../application/contracts/alert-event';
import { ProcessAlertEventUseCase } from '../application/use-cases/process-alert-event.use-case';

@Controller('internal/alert-events')
export class AlertEventsController {
  constructor(
    private readonly processAlertEventUseCase: ProcessAlertEventUseCase,
  ) {}

  @Post()
  async processEvent(@Body() event: AlertEvent) {
    const alert = await this.processAlertEventUseCase.execute(event);

    return {
      processed: true,
      alert: alert?.toObject() ?? null,
    };
  }
}

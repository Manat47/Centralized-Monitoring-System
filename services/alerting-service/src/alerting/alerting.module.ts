import { Module } from '@nestjs/common';

import { ALERT_REPOSITORY } from './domain/repositories/alert.repository';
import { DrizzleAlertRepository } from './infrastructure/persistence/drizzle-alert.repository';
import { ProcessAlertEventUseCase } from './application/use-cases/process-alert-event.use-case';
import { AlertEventsController } from './presentation/alert-events.controller';
import { AlertEventConsumer } from './infrastructure/messaging/alert-event.consumer';
import { FindAlertsUseCase } from './application/use-cases/find-alerts.use-case';
import { AlertsController } from './presentation/alerts.controller';
import { FindAlertByIdUseCase } from './application/use-cases/find-alert-by-id.use-case';
import { AcknowledgeAlertUseCase } from './application/use-cases/acknowledge-alert.use-case';
import { CloseAlertUseCase } from './application/use-cases/close-alert.use-case';

@Module({
  controllers: [AlertEventsController, AlertEventConsumer, AlertsController],
  providers: [
    ProcessAlertEventUseCase,
    FindAlertsUseCase,
    FindAlertByIdUseCase,
    AcknowledgeAlertUseCase,
    CloseAlertUseCase,
    {
      provide: ALERT_REPOSITORY,
      useClass: DrizzleAlertRepository,
    },
  ],
})
export class AlertingModule {}

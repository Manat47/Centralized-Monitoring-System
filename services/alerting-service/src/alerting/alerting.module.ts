import { Module } from '@nestjs/common';

import { ALERT_REPOSITORY } from './domain/repositories/alert.repository';
import { DrizzleAlertRepository } from './infrastructure/persistence/drizzle-alert.repository';
import { ProcessAlertEventUseCase } from './application/use-cases/process-alert-event.use-case';
import { AlertEventsController } from './presentation/alert-events.controller';
import { AlertEventConsumer } from './infrastructure/messaging/alert-event.consumer';

@Module({
  controllers: [AlertEventsController, AlertEventConsumer],
  providers: [
    ProcessAlertEventUseCase,
    {
      provide: ALERT_REPOSITORY,
      useClass: DrizzleAlertRepository,
    },
  ],
})
export class AlertingModule {}

import { Module } from '@nestjs/common';

import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFICATION_SENDER } from './domain/ports/notification-sender.port';
import { ConsoleNotificationSender } from './infrastructure/providers/console-notification.sender';
import { NotificationEventConsumer } from './infrastructure/messaging/notification-event.consumer';

@Module({
  controllers: [NotificationEventConsumer],
  providers: [
    SendNotificationUseCase,
    {
      provide: NOTIFICATION_SENDER,
      useClass: ConsoleNotificationSender,
    },
  ],
  exports: [SendNotificationUseCase],
})
export class NotificationModule {}

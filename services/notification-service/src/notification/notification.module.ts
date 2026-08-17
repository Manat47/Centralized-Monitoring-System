import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFICATION_SENDER } from './domain/ports/notification-sender.port';
import { GmailSmtpNotificationSender } from './infrastructure/providers/gmail-smtp-notification.sender';
import { NotificationEventConsumer } from './infrastructure/messaging/notification-event.consumer';

@Module({
  imports: [ConfigModule],

  controllers: [NotificationEventConsumer],

  providers: [
    SendNotificationUseCase,
    {
      provide: NOTIFICATION_SENDER,
      useClass: GmailSmtpNotificationSender,
    },
  ],

  exports: [SendNotificationUseCase],
})
export class NotificationModule {}

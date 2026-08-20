import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFICATION_SENDER } from './domain/ports/notification-sender.port';
import { GmailSmtpNotificationSender } from './infrastructure/providers/gmail-smtp-notification.sender';
import { NotificationEventConsumer } from './infrastructure/messaging/notification-event.consumer';
import { NOTIFICATION_RECIPIENT_REPOSITORY } from './domain/ports/notification-recipient.repository';
import { DrizzleNotificationRecipientRepository } from './infrastructure/persistence/drizzle-notification-recipient.repository';
import { ListNotificationRecipientsUseCase } from './application/use-cases/list-notification-recipients.use-case';
import { UpdateNotificationRecipientsUseCase } from './application/use-cases/update-notification-recipients.use-case';
import { NotificationRecipientsController } from './presentation/notification-recipients.controller';

@Module({
  imports: [ConfigModule],

  controllers: [NotificationEventConsumer, NotificationRecipientsController],

  providers: [
    SendNotificationUseCase,
    ListNotificationRecipientsUseCase,
    UpdateNotificationRecipientsUseCase,
    {
      provide: NOTIFICATION_SENDER,
      useClass: GmailSmtpNotificationSender,
    },
    {
      provide: NOTIFICATION_RECIPIENT_REPOSITORY,
      useClass: DrizzleNotificationRecipientRepository,
    },
  ],

  exports: [SendNotificationUseCase],
})
export class NotificationModule {}

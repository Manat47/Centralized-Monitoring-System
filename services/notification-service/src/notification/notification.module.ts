import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { NOTIFICATION_SENDER } from './domain/ports/notification-sender.port';
import { GmailSmtpNotificationSender } from './infrastructure/providers/gmail-smtp-notification.sender';
import { NotificationEventConsumer } from './infrastructure/messaging/notification-event.consumer';
import { NOTIFICATION_RECIPIENT_REPOSITORY } from './domain/ports/notification-recipient.repository';
import { DrizzleNotificationRecipientRepository } from './infrastructure/persistence/drizzle-notification-recipient.repository';
import { ListNotificationRecipientsUseCase } from './application/use-cases/list-notification-recipients.use-case';
import { UpdateNotificationRecipientsUseCase } from './application/use-cases/update-notification-recipients.use-case';
import { NotificationRecipientsController } from './presentation/notification-recipients.controller';
import { AUDIT_EVENT_PUBLISHER } from './domain/ports/audit-event-publisher.port';
import { AUDIT_EVENTS_CLIENT } from './infrastructure/messaging/rabbitmq.constants';
import { RabbitMqAuditEventPublisher } from './infrastructure/messaging/rabbitmq-audit-event.publisher';
import { SendTestNotificationUseCase } from './application/use-cases/send-test-notification.use-case';
import { SendUserInvitationUseCase } from './application/use-cases/send-user-invitation.use-case';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUDIT_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl =
            configService.get<string>('RABBITMQ_URL') ??
            'amqp://monitoring_user:change-me@localhost:5672';
          const queue =
            configService.get<string>('RABBITMQ_AUDIT_QUEUE') ?? 'audit_events';

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
  ],

  controllers: [NotificationEventConsumer, NotificationRecipientsController],

  providers: [
    SendNotificationUseCase,
    ListNotificationRecipientsUseCase,
    UpdateNotificationRecipientsUseCase,
    SendTestNotificationUseCase,
    SendUserInvitationUseCase,
    {
      provide: AUDIT_EVENT_PUBLISHER,
      useClass: RabbitMqAuditEventPublisher,
    },
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

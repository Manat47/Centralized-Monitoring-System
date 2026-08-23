import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  NOTIFICATION_EVENTS_CLIENT,
  RabbitMqNotificationEventPublisher,
} from './infrastructure/publishers/rabbitmq-notification-event.publisher';
import { NOTIFICATION_EVENT_PUBLISHER } from './domain/port/notification-event-publisher.port';
import {
  AUDIT_EVENTS_CLIENT,
  RabbitMqAuditEventPublisher,
} from './infrastructure/publishers/rabbitmq-audit-event.publisher';
import { AUDIT_EVENT_PUBLISHER } from './domain/port/audit-event-publisher.port';
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
import { QueryAlertReportSummaryUseCase } from './application/use-cases/query-alert-report-summary.use-case';
import { AssetLifecycleEventConsumer } from './infrastructure/messaging/asset-lifecycle-event.consumer';
import { ResolveAlertsForDeactivatedAssetUseCase } from './application/use-cases/resolve-alerts-for-deactivated-asset.use-case';

@Module({
  imports: [
    ConfigModule,

    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');

          const queue = configService.get<string>(
            'RABBITMQ_NOTIFICATION_QUEUE',
          );

          if (!rabbitMqUrl || !queue) {
            throw new Error(
              'RABBITMQ_URL or RABBITMQ_NOTIFICATION_QUEUE is not defined',
            );
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
      {
        name: AUDIT_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],

        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');

          const queue = configService.get<string>('RABBITMQ_AUDIT_QUEUE');

          if (!rabbitMqUrl || !queue) {
            throw new Error(
              'RABBITMQ_URL or RABBITMQ_AUDIT_QUEUE is not defined',
            );
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [
    AlertEventsController,
    AlertEventConsumer,
    AssetLifecycleEventConsumer,
    AlertsController,
  ],
  providers: [
    ProcessAlertEventUseCase,
    FindAlertsUseCase,
    FindAlertByIdUseCase,
    AcknowledgeAlertUseCase,
    CloseAlertUseCase,
    QueryAlertReportSummaryUseCase,
    ResolveAlertsForDeactivatedAssetUseCase,
    {
      provide: ALERT_REPOSITORY,
      useClass: DrizzleAlertRepository,
    },
    {
      provide: NOTIFICATION_EVENT_PUBLISHER,
      useClass: RabbitMqNotificationEventPublisher,
    },
    {
      provide: AUDIT_EVENT_PUBLISHER,
      useClass: RabbitMqAuditEventPublisher,
    },
  ],
})
export class AlertingModule {}

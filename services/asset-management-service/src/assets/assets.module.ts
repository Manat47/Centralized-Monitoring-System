import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  ASSET_LIFECYCLE_EVENTS_CLIENT,
  AUDIT_EVENTS_CLIENT,
} from './infrastructure/messaging/rabbitmq.constants';
import { AUDIT_EVENT_PUBLISHER } from './domain/ports/audit-event-publisher.port';
import { RabbitMqAuditEventPublisher } from './infrastructure/publishers/rabbitmq-audit-event.publisher';
import { ASSET_LIFECYCLE_EVENT_PUBLISHER } from './domain/ports/asset-lifecycle-event-publisher.port';
import { RabbitMqAssetLifecycleEventPublisher } from './infrastructure/publishers/rabbitmq-asset-lifecycle-event.publisher';
import { DatabaseModule } from '../database/database.module';
import { CreateAssetUseCase } from './application/use-cases/create-asset.use-case';
import { ASSET_REPOSITORY } from './domain/repositories/asset.repository';
import { DrizzleAssetRepository } from './infrastructure/persistence/drizzle-asset.repository';
import { AssetsController } from './assets.controller';
import { FindAllAssetsUseCase } from './application/use-cases/find-all-assets.use-case';
import { FindAssetByIdUseCase } from './application/use-cases/find-asset-by-id.use-case';
import { UpdateAssetUseCase } from './application/use-cases/update-asset.use-case';
import { UpdateAssetStatusUseCase } from './application/use-cases/update-asset-status.use-case';
import { DeactivateAssetUseCase } from './application/use-cases/deactivate-asset.use-case';

@Module({
  imports: [
    DatabaseModule,
    ClientsModule.registerAsync([
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
      {
        name: ASSET_LIFECYCLE_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');
          const queue =
            configService.get<string>('RABBITMQ_ALERT_QUEUE') ?? 'alert_events';

          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL is not defined');
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

  controllers: [AssetsController],

  providers: [
    CreateAssetUseCase,
    FindAllAssetsUseCase,
    FindAssetByIdUseCase,
    UpdateAssetUseCase,
    UpdateAssetStatusUseCase,
    DeactivateAssetUseCase,
    {
      provide: ASSET_REPOSITORY,
      useClass: DrizzleAssetRepository,
    },
    {
      provide: AUDIT_EVENT_PUBLISHER,
      useClass: RabbitMqAuditEventPublisher,
    },
    {
      provide: ASSET_LIFECYCLE_EVENT_PUBLISHER,
      useClass: RabbitMqAssetLifecycleEventPublisher,
    },
  ],
})
export class AssetsModule {}

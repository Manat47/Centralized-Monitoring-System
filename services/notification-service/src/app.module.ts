import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationModule } from './notification/notification.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    NotificationModule,
    HealthModule,
  ],
})
export class AppModule {}

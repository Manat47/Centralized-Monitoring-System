import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MonitoringModule,
    HealthModule,
  ],
})
export class AppModule {}

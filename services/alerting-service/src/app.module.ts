import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlertingModule } from './alerting/alerting.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LogFindingModule } from './log-finding/log-finding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AlertingModule,
    HealthModule,
    LogFindingModule,
  ],
})
export class AppModule {}

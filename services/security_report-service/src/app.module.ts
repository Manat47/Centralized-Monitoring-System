import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { ReportModule } from './report/report.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuditModule,
    ReportModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';

import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditEventConsumer } from './infrastructure/messaging/audit-event.consumer';
import { DrizzleAuditLogRepository } from './infrastructure/persistence/drizzle-audit-log.repository';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs.use-case';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { QueryAuditReportSummaryUseCase } from './application/use-cases/query-audit-report-summary.use-case';

@Module({
  controllers: [AuditEventConsumer, AuditLogController],

  providers: [
    RecordAuditLogUseCase,
    ListAuditLogsUseCase,
    QueryAuditReportSummaryUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: DrizzleAuditLogRepository,
    },
  ],

  exports: [RecordAuditLogUseCase, QueryAuditReportSummaryUseCase],
})
export class AuditModule {}

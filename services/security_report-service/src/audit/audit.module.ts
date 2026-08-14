import { Module } from '@nestjs/common';

import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditEventConsumer } from './infrastructure/messaging/audit-event.consumer';
import { DrizzleAuditLogRepository } from './infrastructure/persistence/drizzle-audit-log.repository';
import { ListAuditLogsUseCase } from './application/use-cases/list-audit-logs.use-case';
import { AuditLogController } from './presentation/controllers/audit-log.controller';

@Module({
  controllers: [AuditEventConsumer, AuditLogController],

  providers: [
    RecordAuditLogUseCase,
    ListAuditLogsUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: DrizzleAuditLogRepository,
    },
  ],

  exports: [RecordAuditLogUseCase],
})
export class AuditModule {}

import { Module } from '@nestjs/common';

import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditEventConsumer } from './infrastructure/messaging/audit-event.consumer';
import { DrizzleAuditLogRepository } from './infrastructure/persistence/drizzle-audit-log.repository';

@Module({
  controllers: [AuditEventConsumer],

  providers: [
    RecordAuditLogUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: DrizzleAuditLogRepository,
    },
  ],

  exports: [RecordAuditLogUseCase],
})
export class AuditModule {}

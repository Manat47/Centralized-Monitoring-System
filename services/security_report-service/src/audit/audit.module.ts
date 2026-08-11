import { Module } from '@nestjs/common';

import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { DrizzleAuditLogRepository } from './infrastructure/persistence/drizzle-audit-log.repository';
import { RecordAuditLogUseCase } from './application/use-cases/record-audit-log.use-case';

@Module({
  providers: [
    RecordAuditLogUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: DrizzleAuditLogRepository,
    },
  ],
  exports: [AUDIT_LOG_REPOSITORY],
})
export class AuditModule {}

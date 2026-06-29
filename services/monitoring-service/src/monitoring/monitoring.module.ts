import { Module } from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from './application/use-cases/create-monitoring-target.use-case';
import { MONITORING_TARGET_REPOSITORY } from './domain/repositories/monitoring-target.repository';
import { DrizzleMonitoringTargetRepository } from './infrastructure/persistence/drizzle-monitoring-target.repository';
import { MonitoringTargetsController } from './presentation/monitoring-targets.controller';

@Module({
  controllers: [MonitoringTargetsController],
  providers: [
    CreateMonitoringTargetUseCase,
    {
      provide: MONITORING_TARGET_REPOSITORY,
      useClass: DrizzleMonitoringTargetRepository,
    },
  ],
})
export class MonitoringModule {}

import { Module } from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from './application/use-cases/create-monitoring-target.use-case';
import { MONITORING_TARGET_REPOSITORY } from './domain/repositories/monitoring-target.repository';
import { DrizzleMonitoringTargetRepository } from './infrastructure/persistence/drizzle-monitoring-target.repository';
import { MonitoringTargetsController } from './presentation/monitoring-targets.controller';
import { VerifyMonitoringTargetUseCase } from './application/use-cases/verify-monitoring-target.use-case';
import { METRICS_COLLECTOR } from './domain/ports/metrics-collector.port';
import { NodeExporterCollector } from './infrastructure/collectors/node-exporter.collector';

@Module({
  controllers: [MonitoringTargetsController],
  providers: [
    CreateMonitoringTargetUseCase,
    VerifyMonitoringTargetUseCase,
    {
      provide: MONITORING_TARGET_REPOSITORY,
      useClass: DrizzleMonitoringTargetRepository,
    },
    {
      provide: METRICS_COLLECTOR,
      useClass: NodeExporterCollector,
    },
  ],
})
export class MonitoringModule {}

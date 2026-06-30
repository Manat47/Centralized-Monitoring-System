import { Module } from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from './application/use-cases/create-monitoring-target.use-case';
import { MONITORING_TARGET_REPOSITORY } from './domain/repositories/monitoring-target.repository';
import { DrizzleMonitoringTargetRepository } from './infrastructure/persistence/drizzle-monitoring-target.repository';
import { MonitoringTargetsController } from './presentation/monitoring-targets.controller';
import { VerifyMonitoringTargetUseCase } from './application/use-cases/verify-monitoring-target.use-case';
import { METRICS_COLLECTOR } from './domain/ports/metrics-collector.port';
import { NodeExporterCollector } from './infrastructure/collectors/node-exporter.collector';
import { EnableMonitoringUseCase } from './application/use-cases/enable-monitoring.use-case';
import { DisableMonitoringUseCase } from './application/use-cases/disable-monitoring.use-case';
import { METRICS_PARSER } from './domain/ports/metrics-parser.port';
import { PrometheusTextParser } from './infrastructure/collectors/prometheus-text.parser';

@Module({
  controllers: [MonitoringTargetsController],
  providers: [
    CreateMonitoringTargetUseCase,
    VerifyMonitoringTargetUseCase,
    EnableMonitoringUseCase,
    DisableMonitoringUseCase,
    {
      provide: MONITORING_TARGET_REPOSITORY,
      useClass: DrizzleMonitoringTargetRepository,
    },
    {
      provide: METRICS_COLLECTOR,
      useClass: NodeExporterCollector,
    },
    {
      provide: METRICS_PARSER,
      useClass: PrometheusTextParser,
    },
  ],
})
export class MonitoringModule {}

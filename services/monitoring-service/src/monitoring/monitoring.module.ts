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
import { CollectTargetMetricsUseCase } from './application/use-cases/collect-target-metrics.use-case';
import { METRICS_STORAGE } from './domain/ports/metrics-storage.port';
import { InfluxMetricsStorage } from './infrastructure/persistence/influx-metrics.storage';
import { CollectEnabledTargetsUseCase } from './application/use-cases/collect-enabled-targets.use-case';
import { MonitoringScheduler } from './infrastructure/collectors/monitoring.scheduler';
import { METRICS_QUERY } from './domain/ports/metrics-query.port';
import { InfluxMetricsQuery } from './infrastructure/persistence/influx-metrics.query';
import { QueryMetricUseCase } from './application/use-cases/query-metric.use-case';
import { QueryMemoryUsageUseCase } from './application/use-cases/query-memory-usage.use-case';
import { QueryDiskUsageUseCase } from './application/use-cases/query-disk-usage.use-case';
import { QueryNetworkRateUseCase } from './application/use-cases/query-network-rate.use-case';
import { QueryCpuUsageUseCase } from './application/use-cases/query-cpu-usage.use-case';
import { QueryMetricsSummaryUseCase } from './application/use-cases/query-metrics-summary.use-case';
import { FindMonitoringTargetsUseCase } from './application/use-cases/find-monitoring-targets.use-case';
import { FindMonitoringTargetByIdUseCase } from './application/use-cases/find-monitoring-target-by-id.use-case';
import { HttpModule } from '@nestjs/axios';
import { ASSET_READER } from './domain/ports/asset-reader.port';
import { AssetServiceClient } from './infrastructure/clients/asset-service.client';

@Module({
  imports: [HttpModule],
  controllers: [MonitoringTargetsController],
  providers: [
    CreateMonitoringTargetUseCase,
    VerifyMonitoringTargetUseCase,
    EnableMonitoringUseCase,
    DisableMonitoringUseCase,
    CollectTargetMetricsUseCase,
    CollectEnabledTargetsUseCase,
    MonitoringScheduler,
    QueryMetricUseCase,
    QueryMemoryUsageUseCase,
    QueryDiskUsageUseCase,
    QueryNetworkRateUseCase,
    QueryCpuUsageUseCase,
    QueryMetricsSummaryUseCase,
    FindMonitoringTargetsUseCase,
    FindMonitoringTargetByIdUseCase,
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
    {
      provide: METRICS_STORAGE,
      useClass: InfluxMetricsStorage,
    },
    {
      provide: METRICS_QUERY,
      useClass: InfluxMetricsQuery,
    },
    {
      provide: ASSET_READER,
      useClass: AssetServiceClient,
    },
  ],
})
export class MonitoringModule {}

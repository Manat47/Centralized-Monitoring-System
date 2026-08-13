import { Injectable } from '@nestjs/common';

import type { MonitoringType } from '../../domain/entities/monitoring-target.entity';
import type { MetricsCollector } from '../../domain/ports/metrics-collector.port';
import type { MetricsCollectorResolver } from '../../domain/ports/metrics-collector-resolver.port';

import { NodeExporterCollector } from './node-exporter.collector';
import { ApplicationMetricsCollector } from './application-metrics.collector';

@Injectable()
export class DefaultMetricsCollectorResolver implements MetricsCollectorResolver {
  constructor(
    private readonly nodeExporterCollector: NodeExporterCollector,
    private readonly applicationMetricsCollector: ApplicationMetricsCollector,
  ) {}

  resolve(monitoringType: MonitoringType): MetricsCollector {
    switch (monitoringType) {
      case 'NODE_EXPORTER':
        return this.nodeExporterCollector;

      case 'PROMETHEUS_APPLICATION':
        return this.applicationMetricsCollector;

      default: {
        const exhaustiveCheck: never = monitoringType;
        throw new Error(
          `Unsupported monitoring type: ${String(exhaustiveCheck)}`,
        );
      }
    }
  }
}

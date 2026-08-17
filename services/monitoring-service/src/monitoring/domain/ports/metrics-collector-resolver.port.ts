import type { MonitoringType } from '../entities/monitoring-target.entity';
import type { MetricsCollector } from './metrics-collector.port';

export const METRICS_COLLECTOR_RESOLVER = Symbol('METRICS_COLLECTOR_RESOLVER');

export interface MetricsCollectorResolver {
  resolve(monitoringType: MonitoringType): MetricsCollector;
}

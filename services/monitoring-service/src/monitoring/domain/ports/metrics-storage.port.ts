import type { ParsedMetric } from './metrics-parser.port';

export interface StoreMetricsInput {
  targetId: string;
  assetId: string;
  metrics: ParsedMetric[];
}

export const METRICS_STORAGE = Symbol('METRICS_STORAGE');

export interface MetricsStorage {
  writeMetrics(input: StoreMetricsInput): Promise<void>;
}

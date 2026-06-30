export interface VerifyMetricsEndpointResult {
  success: boolean;
  errorMessage: string | null;
}
export interface CollectMetricsResult {
  success: boolean;
  rawMetrics: string | null;
  collectedAt: Date;
  errorMessage: string | null;
}

export const METRICS_COLLECTOR = Symbol('METRICS_COLLECTOR');
export interface MetricsCollector {
  verify(url: string): Promise<VerifyMetricsEndpointResult>;
  collect(url: string): Promise<CollectMetricsResult>;
}

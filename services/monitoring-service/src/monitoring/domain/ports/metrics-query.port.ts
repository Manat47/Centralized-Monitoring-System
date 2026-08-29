export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels: Record<string, string>;
}

export interface QueryMetricInput {
  assetId: string;
  measurement: string;
  start: Date;
  end: Date;
}

export interface QueryMetricForAssetsInput {
  assetIds: string[];
  measurement: string;
  start: Date;
  end: Date;
}

export interface AssetMetricDataPoint extends MetricDataPoint {
  assetId: string;
}

export const METRICS_QUERY = Symbol('METRICS_QUERY');

export interface MetricsQuery {
  queryMetric(input: QueryMetricInput): Promise<MetricDataPoint[]>;
  queryMetricForAssets(
    input: QueryMetricForAssetsInput,
  ): Promise<AssetMetricDataPoint[]>;
}

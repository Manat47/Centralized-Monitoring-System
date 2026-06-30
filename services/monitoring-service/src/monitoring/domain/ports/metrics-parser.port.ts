export interface ParsedMetric {
  name: string;
  labels: Record<string, string>;
  value: number;
  collectedAt: Date;
}

export const METRICS_PARSER = Symbol('METRICS_PARSER');

export interface MetricsParser {
  parse(rawMetrics: string, collectedAt: Date): ParsedMetric[];
}

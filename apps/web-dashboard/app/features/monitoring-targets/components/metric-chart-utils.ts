export interface MetricChartStats {
  latest: number;
  average: number;
  p95: number;
  maximum: number;
}

export interface MetricThreshold {
  id: string;
  value: number;
  severity: "WARNING" | "CRITICAL";
}

export function calculateMetricStats(
  values: number[],
): MetricChartStats | null {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0) {
    return null;
  }

  const sortedValues = [...finiteValues].sort((a, b) => a - b);
  const p95Index = Math.max(0, Math.ceil(sortedValues.length * 0.95) - 1);

  return {
    latest: finiteValues[finiteValues.length - 1],
    average:
      finiteValues.reduce((total, value) => total + value, 0) /
      finiteValues.length,
    p95: sortedValues[p95Index],
    maximum: sortedValues[sortedValues.length - 1],
  };
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let currentValue = value;
  let unitIndex = 0;

  while (currentValue >= 1024 && unitIndex < units.length - 1) {
    currentValue /= 1024;
    unitIndex += 1;
  }

  return `${currentValue.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatBytesPerSecond(value: number): string {
  return `${formatBytes(value)}/s`;
}

export function getThresholdColor(
  severity: MetricThreshold["severity"],
): string {
  return severity === "CRITICAL" ? "#e11d48" : "#f59e0b";
}

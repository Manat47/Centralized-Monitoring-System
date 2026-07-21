import type { MetricRule } from "../types/metric-rule";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getMetricRules(): Promise<MetricRule[]> {
  const response = await fetch(`${API_GATEWAY_URL}/metric-rules`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch metric rules: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MetricRule[];
}

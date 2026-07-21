import type { CreateMetricRuleInput, MetricRule } from "../types/metric-rule";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function createMetricRule(
  input: CreateMetricRuleInput,
): Promise<MetricRule> {
  const response = await fetch(`${API_GATEWAY_URL}/metric-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to create metric rule: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MetricRule;
}

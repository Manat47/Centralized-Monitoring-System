import type { CreateMetricRuleInput, MetricRule } from "../types/metric-rule";
import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function createMetricRule(
  input: CreateMetricRuleInput,
): Promise<MetricRule> {
  const response = await authenticatedFetch(`${API_GATEWAY_URL}/metric-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    throw new Error(
      message ||
        `Failed to create metric rule: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MetricRule;
}

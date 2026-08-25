import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { MetricRule, UpdateMetricRuleInput } from "../types/metric-rule";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function parseResponse(response: Response, message: string) {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const detail = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(
      detail || `${message}: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MetricRule;
}

export async function updateMetricRule(
  ruleId: string,
  input: UpdateMetricRuleInput,
) {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/metric-rules/${ruleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response, "Failed to update metric rule");
}

async function runAction(
  ruleId: string,
  action: "enable" | "disable" | "archive",
) {
  const isArchive = action === "archive";
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/metric-rules/${ruleId}${isArchive ? "" : `/${action}`}`,
    { method: isArchive ? "DELETE" : "POST" },
  );
  return parseResponse(response, `Failed to ${action} metric rule`);
}

export const enableMetricRule = (ruleId: string) => runAction(ruleId, "enable");
export const disableMetricRule = (ruleId: string) =>
  runAction(ruleId, "disable");
export const archiveMetricRule = (ruleId: string) =>
  runAction(ruleId, "archive");

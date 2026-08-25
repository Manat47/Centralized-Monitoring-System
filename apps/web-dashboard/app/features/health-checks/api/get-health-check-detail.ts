import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  HealthCheckHistoryPoint,
  HealthCheckReportSummary,
  HealthCheckTarget,
} from "../types/health-check";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function getJson<T>(url: string, message: string): Promise<T> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error(`${message}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getHealthCheckTarget(id: string): Promise<HealthCheckTarget> {
  return getJson(`${API_GATEWAY_URL}/health-check-targets/${id}`, "Failed to fetch health check");
}

export function getHealthCheckHistory(
  id: string,
  start: Date,
  end: Date,
): Promise<HealthCheckHistoryPoint[]> {
  const query = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return getJson(
    `${API_GATEWAY_URL}/health-check-targets/${id}/history?${query}`,
    "Failed to fetch health history",
  );
}

export function getHealthCheckReportSummary(
  id: string,
  start: Date,
  end: Date,
): Promise<HealthCheckReportSummary> {
  const query = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return getJson(
    `${API_GATEWAY_URL}/health-check-targets/${id}/report-summary?${query}`,
    "Failed to fetch health summary",
  );
}

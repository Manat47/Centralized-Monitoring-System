import type { MonitoringTarget } from "../types/monitoring-target";
import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getMonitoringTargets(
  includeArchived = false,
): Promise<MonitoringTarget[]> {
  const query = includeArchived ? "?includeArchived=true" : "";
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/monitoring-targets${query}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch monitoring targets: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MonitoringTarget[];
}

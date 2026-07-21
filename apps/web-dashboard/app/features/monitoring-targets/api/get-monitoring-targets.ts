import type { MonitoringTarget } from "../types/monitoring-target";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getMonitoringTargets(): Promise<MonitoringTarget[]> {
  const response = await fetch(`${API_GATEWAY_URL}/monitoring-targets`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch monitoring targets: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MonitoringTarget[];
}

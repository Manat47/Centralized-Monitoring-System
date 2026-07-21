import type { DashboardSummary } from "../types/dashboard-summary";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_GATEWAY_URL}/dashboard/summary`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dashboard summary: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as DashboardSummary;
}

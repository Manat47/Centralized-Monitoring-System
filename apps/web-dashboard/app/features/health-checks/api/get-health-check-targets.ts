import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { HealthCheckTarget } from "../types/health-check";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getHealthCheckTargets(): Promise<HealthCheckTarget[]> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/health-check-targets`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch health check targets: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as HealthCheckTarget[];
}

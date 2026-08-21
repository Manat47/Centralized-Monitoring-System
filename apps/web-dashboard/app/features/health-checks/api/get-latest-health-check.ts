import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { LatestHealthCheck } from "../types/health-check";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getLatestHealthCheck(
  healthCheckTargetId: string,
): Promise<LatestHealthCheck | null> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/health-check-targets/${healthCheckTargetId}/latest`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest health check: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as LatestHealthCheck | null;
}

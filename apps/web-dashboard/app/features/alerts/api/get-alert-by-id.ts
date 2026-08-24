import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { AlertDetail } from "../types/alert";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getAlertById(alertId: string): Promise<AlertDetail> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/alerts/${alertId}`,
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Failed to fetch alert: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as AlertDetail;
}

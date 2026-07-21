import type { SystemStatusResponse } from "../types/system-status";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const response = await fetch(`${API_GATEWAY_URL}/system/status`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch system status: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as SystemStatusResponse;
}

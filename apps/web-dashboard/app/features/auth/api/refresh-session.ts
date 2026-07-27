import type { RefreshResponse } from "../types/auth";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function refreshSession(): Promise<RefreshResponse> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Session refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as RefreshResponse;
}

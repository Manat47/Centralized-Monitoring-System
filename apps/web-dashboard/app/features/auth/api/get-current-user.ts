import type { CurrentUser } from "../types/auth";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getCurrentUser(
  accessToken: string,
): Promise<CurrentUser> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },

    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch current user: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as CurrentUser;
}

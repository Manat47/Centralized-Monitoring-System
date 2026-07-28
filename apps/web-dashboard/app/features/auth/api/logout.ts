const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function logout(): Promise<void> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout failed: ${response.status} ${response.statusText}`);
  }
}

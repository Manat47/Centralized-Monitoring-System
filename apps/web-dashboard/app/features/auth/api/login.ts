import type { LoginInput, LoginResponse } from "../types/auth";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await fetch(`${API_GATEWAY_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Login failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as LoginResponse;
}

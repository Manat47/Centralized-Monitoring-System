import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { CreateUserInput, User } from "../types/user";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function createUser(input: CreateUserInput): Promise<User> {
  const response = await authenticatedFetch(`${API_GATEWAY_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to create user: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as User;
}

import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { UpdateUserStatusInput, User } from "../types/user";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function updateUserStatus(
  userId: string,
  input: UpdateUserStatusInput,
): Promise<User> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/users/${userId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to update user status: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as User;
}

import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { UpdateUserStatusInput, User } from "../types/user";
import { getUserApiError } from "./user-api-error";

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
    throw new Error(
      await getUserApiError(response, "Failed to update user status"),
    );
  }

  return (await response.json()) as User;
}

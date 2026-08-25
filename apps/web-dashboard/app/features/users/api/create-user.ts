import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { CreateUserInput, User } from "../types/user";
import { getUserApiError } from "./user-api-error";

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
    throw new Error(
      await getUserApiError(response, "Failed to invite user"),
    );
  }

  return (await response.json()) as User;
}

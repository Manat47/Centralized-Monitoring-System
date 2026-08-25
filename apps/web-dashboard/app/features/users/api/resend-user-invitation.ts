import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { User } from "../types/user";
import { getUserApiError } from "./user-api-error";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function resendUserInvitation(userId: string): Promise<User> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/users/${userId}/invitations/resend`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(
      await getUserApiError(response, "Failed to resend invitation"),
    );
  }

  return (await response.json()) as User;
}

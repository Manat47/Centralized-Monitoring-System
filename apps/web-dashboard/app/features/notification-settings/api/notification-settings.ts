import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  NotificationRecipient,
  TestNotificationResult,
} from "../types/notification-settings";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (Array.isArray(body?.message)) {
    return body.message.join(", ");
  }

  return body?.message ?? fallback;
}

export async function getNotificationRecipients(): Promise<
  NotificationRecipient[]
> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/notification-recipients`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to load notification recipients"),
    );
  }

  return (await response.json()) as NotificationRecipient[];
}

export async function updateNotificationRecipients(
  emails: string[],
): Promise<NotificationRecipient[]> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/notification-recipients`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update notification recipients"),
    );
  }

  return (await response.json()) as NotificationRecipient[];
}

export async function sendTestNotification(): Promise<TestNotificationResult> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/notification-recipients/test`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to send test notification"),
    );
  }

  return (await response.json()) as TestNotificationResult;
}

import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  NotificationRecipient,
  NotificationSettings,
  TestNotificationResult,
  TestChannelResult,
  UpdateNotificationSettingsInput,
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

const settingsUrl = `${API_GATEWAY_URL}/notification-settings`;

function normalizeSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== "object") {
    return { isFallbackEnabled: false, recipients: [] };
  }
  const raw = value as Record<string, unknown>;
  const rows = Array.isArray(raw.recipients) ? raw.recipients : [];
  const recipients = rows.flatMap((item): NotificationSettings["recipients"] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const channel = row.channel;
    if (
      typeof row.recipientId !== "string" ||
      !["email", "line", "slack", "webhook"].includes(String(channel))
    ) return [];
    return [{
      recipientId: row.recipientId,
      channel: channel as NotificationSettings["recipients"][number]["channel"],
      name: typeof row.name === "string" ? row.name : "Unnamed channel",
      destination: typeof row.destination === "string" ? row.destination : "",
      isEnabled: row.isEnabled === true,
      priority: typeof row.priority === "number" ? row.priority : null,
      hasSecretToken: row.hasSecretToken === true,
    }];
  });
  return { isFallbackEnabled: raw.isFallbackEnabled === true, recipients };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await authenticatedFetch(settingsUrl);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load notification settings"));
  }
  return normalizeSettings(await response.json());
}

export async function updateNotificationSettings(
  input: UpdateNotificationSettingsInput,
): Promise<NotificationSettings> {
  const response = await authenticatedFetch(settingsUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to save notification settings"));
  }
  return normalizeSettings(await response.json());
}

export async function testNotificationChannel(recipientId: string): Promise<TestChannelResult> {
  const response = await authenticatedFetch(
    `${settingsUrl}/${encodeURIComponent(recipientId)}/test`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Channel test failed"));
  }
  return (await response.json()) as TestChannelResult;
}

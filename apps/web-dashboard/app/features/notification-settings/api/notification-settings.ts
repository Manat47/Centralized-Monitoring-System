import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  NotificationSettings,
  TestChannelResult,
  CreateNotificationChannelInput,
  PatchNotificationChannelInput,
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

async function mutateSettings(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: unknown,
): Promise<NotificationSettings> {
  const response = await authenticatedFetch(`${settingsUrl}${path}`, {
    method,
    ...(payload === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update notification settings"));
  }
  return normalizeSettings(await response.json());
}

export function createNotificationChannel(input: CreateNotificationChannelInput) {
  return mutateSettings("/recipients", "POST", input);
}

export function patchNotificationChannel(input: {
  recipientId: string;
  patch: PatchNotificationChannelInput;
}) {
  return mutateSettings(`/recipients/${encodeURIComponent(input.recipientId)}`, "PATCH", input.patch);
}

export function deleteNotificationChannel(recipientId: string) {
  return mutateSettings(`/recipients/${encodeURIComponent(recipientId)}`, "DELETE");
}

export function patchNotificationRouting(isFallbackEnabled: boolean) {
  return mutateSettings("/routing", "PATCH", { isFallbackEnabled });
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

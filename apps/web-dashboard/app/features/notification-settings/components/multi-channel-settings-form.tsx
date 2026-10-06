"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useMultiChannelSettings,
  useTestNotificationChannel,
  useUpdateMultiChannelSettings,
} from "../api/use-notification-settings";
import type {
  NotificationChannel,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from "../types/notification-settings";

const channels: NotificationChannel[] = ["email", "line", "slack", "webhook"];
const labels: Record<NotificationChannel, string> = {
  email: "Email",
  line: "LINE",
  slack: "Slack",
  webhook: "Webhook",
};
const placeholders: Record<NotificationChannel, string> = {
  email: "recipient@example.com",
  line: "LINE user or group ID",
  slack: "https://hooks.slack.com/services/...",
  webhook: "https://example.com/notifications",
};

interface DraftRecipient {
  key: string;
  recipientId?: string;
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken: string;
  hasSecretToken: boolean;
  isEnabled: boolean;
}

interface DraftSettings {
  isFallbackEnabled: boolean;
  recipients: DraftRecipient[];
}

function makeDraft(settings: NotificationSettings): DraftSettings {
  return {
    isFallbackEnabled: settings.isFallbackEnabled,
    recipients: [...settings.recipients]
      .sort((left, right) => (left.priority ?? 9999) - (right.priority ?? 9999))
      .map((recipient) => ({
        key: recipient.recipientId,
        recipientId: recipient.recipientId,
        channel: recipient.channel,
        name: recipient.name,
        destination: recipient.destination,
        secretToken: "",
        hasSecretToken: recipient.hasSecretToken,
        isEnabled: recipient.isEnabled,
      })),
  };
}

function toPayload(draft: DraftSettings): UpdateNotificationSettingsInput {
  let priority = 0;
  return {
    isFallbackEnabled: draft.isFallbackEnabled,
    recipients: draft.recipients.map((recipient) => ({
      ...(recipient.recipientId ? { recipientId: recipient.recipientId } : {}),
      channel: recipient.channel,
      name: recipient.name.trim(),
      destination: recipient.destination.trim(),
      ...(recipient.secretToken.trim()
        ? { secretToken: recipient.secretToken.trim() }
        : {}),
      isEnabled: recipient.isEnabled,
      priority:
        draft.isFallbackEnabled && recipient.isEnabled ? ++priority : null,
    })),
  };
}

export function MultiChannelSettingsForm() {
  const settingsQuery = useMultiChannelSettings();
  const saveMutation = useUpdateMultiChannelSettings();
  const testMutation = useTestNotificationChannel();
  const [draft, setDraft] = useState<DraftSettings | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  if (settingsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading notification settings...</p>;
  }
  if (settingsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {settingsQuery.error instanceof Error
          ? settingsQuery.error.message
          : "Failed to load notification settings"}
      </p>
    );
  }

  const saved = settingsQuery.data ?? { isFallbackEnabled: false, recipients: [] };
  const current = draft ?? makeDraft(saved);
  const enabledKeys = current.recipients
    .filter((recipient) => recipient.isEnabled)
    .map((recipient) => recipient.key);

  function edit(transform: (value: DraftSettings) => DraftSettings) {
    setDraft((value) => transform(value ?? makeDraft(saved)));
    setFeedback(null);
  }

  function updateRecipient(key: string, patch: Partial<DraftRecipient>) {
    edit((value) => ({
      ...value,
      recipients: value.recipients.map((recipient) =>
        recipient.key === key ? { ...recipient, ...patch } : recipient,
      ),
    }));
  }

  function addRecipient(channel: NotificationChannel) {
    edit((value) => ({
      ...value,
      recipients: [
        ...value.recipients,
        {
          key: crypto.randomUUID(),
          channel,
          name: labels[channel],
          destination: "",
          secretToken: "",
          hasSecretToken: false,
          isEnabled: true,
        },
      ],
    }));
  }

  function moveRecipient(key: string, direction: -1 | 1) {
    edit((value) => {
      const ordered = [...value.recipients];
      const enabled = ordered.filter((recipient) => recipient.isEnabled);
      const position = enabled.findIndex((recipient) => recipient.key === key);
      const neighbor = enabled[position + direction];
      if (!neighbor) return value;
      const from = ordered.findIndex((recipient) => recipient.key === key);
      const to = ordered.findIndex((recipient) => recipient.key === neighbor.key);
      [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
      return { ...value, recipients: ordered };
    });
  }

  async function save() {
    const payload = toPayload(current);
    if (payload.recipients.some((recipient) => !recipient.name || !recipient.destination)) {
      setFeedback("Enter a name and destination for every channel.");
      return;
    }
    if (payload.recipients.some((recipient) =>
      recipient.channel === "webhook" &&
      !recipient.secretToken &&
      !current.recipients.find((item) => item.key === (recipient.recipientId ?? ""))?.hasSecretToken,
    )) {
      setFeedback("Enter a signing secret for each new webhook.");
      return;
    }
    try {
      await saveMutation.mutateAsync(payload);
      setDraft(null);
      setFeedback("Notification settings saved.");
    } catch {
      // The mutation error is rendered below.
    }
  }

  async function testChannel(recipientId: string, channel: NotificationChannel) {
    setTestingId(recipientId);
    setFeedback(null);
    try {
      const result = await testMutation.mutateAsync(recipientId);
      setFeedback(result.success
        ? `${labels[channel]} test sent successfully.`
        : `${labels[channel]} test failed: ${result.errorMessage ?? "Provider unavailable"}`);
    } catch {
      // The mutation error is rendered below.
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Delivery routing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              role="switch"
              checked={current.isFallbackEnabled}
              onChange={(event) =>
                edit((value) => ({ ...value, isFallbackEnabled: event.target.checked }))
              }
              className="size-4 accent-blue-600"
            />
            Enable Fallback Routing
          </label>
          <p className="text-sm text-muted-foreground">
            {current.isFallbackEnabled
              ? "Try enabled channels in priority order. Stop after the first success."
              : "Send to every enabled channel at the same time."}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <Button key={channel} type="button" variant="outline" onClick={() => addRecipient(channel)}>
            <Plus className="size-4" /> Add {labels[channel]}
          </Button>
        ))}
      </div>

      {current.recipients.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No channels configured. Add a destination to begin.
        </p>
      )}

      {current.recipients.map((recipient) => {
        const position = enabledKeys.indexOf(recipient.key);
        return (
          <Card key={recipient.key}>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {labels[recipient.channel]}
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={recipient.isEnabled}
                      onChange={(event) => updateRecipient(recipient.key, { isEnabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => edit((value) => ({
                    ...value,
                    recipients: value.recipients.filter((item) => item.key !== recipient.key),
                  }))}
                  aria-label={`Remove ${recipient.name}`}
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  Name
                  <Input value={recipient.name} onChange={(event) => updateRecipient(recipient.key, { name: event.target.value })} maxLength={120} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Destination
                  <Input value={recipient.destination} onChange={(event) => updateRecipient(recipient.key, { destination: event.target.value })} placeholder={placeholders[recipient.channel]} maxLength={2048} />
                </label>
              </div>

              {recipient.channel === "webhook" && (
                <label className="block space-y-1 text-sm font-medium">
                  Secret Key
                  <Input type="password" autoComplete="new-password" value={recipient.secretToken} onChange={(event) => updateRecipient(recipient.key, { secretToken: event.target.value })} placeholder={recipient.hasSecretToken ? "Configured - leave blank to keep" : "Enter signing secret"} />
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                {current.isFallbackEnabled && recipient.isEnabled ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Priority {position + 1}</span>
                    <Button type="button" size="sm" variant="outline" disabled={position <= 0} onClick={() => moveRecipient(recipient.key, -1)} aria-label={`Move ${recipient.name} up`}><ArrowUp className="size-4" /></Button>
                    <Button type="button" size="sm" variant="outline" disabled={position >= enabledKeys.length - 1} onClick={() => moveRecipient(recipient.key, 1)} aria-label={`Move ${recipient.name} down`}><ArrowDown className="size-4" /></Button>
                  </div>
                ) : <span />}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!recipient.recipientId || draft !== null || testMutation.isPending || saveMutation.isPending}
                  onClick={() => recipient.recipientId && testChannel(recipient.recipientId, recipient.channel)}
                >
                  {testingId === recipient.recipientId ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Test Channel
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(feedback || saveMutation.error || testMutation.error) && (
        <p role="status" className="text-sm">
          {feedback ?? (saveMutation.error instanceof Error ? saveMutation.error.message : null) ??
            (testMutation.error instanceof Error ? testMutation.error.message : "Operation failed")}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!draft || saveMutation.isPending} onClick={() => { setDraft(null); setFeedback(null); }}>Discard</Button>
        <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700" disabled={!draft || saveMutation.isPending} onClick={save}>
          {saveMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

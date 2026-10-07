"use client";

import { useState } from "react";
import { Hash, LoaderCircle, Mail, MessageCircle, Plus, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";

import { useAllUsers } from "@/app/features/users/api/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { RecipientPicker } from "./recipient-picker";

const channels: NotificationChannel[] = ["email", "line", "slack", "webhook"];
const labels: Record<NotificationChannel, string> = {
  email: "Email",
  line: "LINE",
  slack: "Slack",
  webhook: "Webhook",
};
const channelIcons = {
  email: Mail,
  line: MessageCircle,
  slack: Hash,
  webhook: WebhookIcon,
};
const channelIconStyles: Record<NotificationChannel, string> = {
  email: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  line: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  slack: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  webhook: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
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
  priority: number | null;
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
        priority: recipient.priority,
      })),
  };
}

function toPayload(draft: DraftSettings): UpdateNotificationSettingsInput {
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
      priority: recipient.priority,
    })),
  };
}

function nextPriority(draft: DraftSettings): number {
  return Math.max(0, ...draft.recipients.map((recipient) => recipient.priority ?? 0)) + 1;
}

function NotificationSettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading notification settings" className="space-y-5">
      <span className="sr-only">Loading notification settings...</span>
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-9 w-28" />)}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
      {[0, 1].map((item) => (
        <Card key={item}>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <div className="flex justify-end border-t pt-3">
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export function MultiChannelSettingsForm() {
  const settingsQuery = useMultiChannelSettings();
  const saveMutation = useUpdateMultiChannelSettings();
  const testMutation = useTestNotificationChannel();
  const usersQuery = useAllUsers();
  const [draft, setDraft] = useState<DraftSettings | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  if (settingsQuery.isLoading) {
    return <NotificationSettingsSkeleton />;
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
  const emailRecipients = current.recipients.filter((recipient) => recipient.channel === "email");
  const priorityOptionCount = Math.max(
    1,
    current.recipients.length,
    ...current.recipients.map((recipient) => recipient.priority ?? 0),
  );

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
          priority: value.isFallbackEnabled ? nextPriority(value) : null,
        },
      ],
    }));
  }

  function addEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const systemUser = usersQuery.data?.find(
      (user) => user.email.trim().toLowerCase() === normalizedEmail,
    );
    edit((value) => {
      if (value.recipients.some(
        (recipient) => recipient.channel === "email" && recipient.destination.toLowerCase() === normalizedEmail,
      )) return value;
      return {
        ...value,
        recipients: [
          ...value.recipients,
          {
            key: crypto.randomUUID(),
            channel: "email",
            name: systemUser?.displayName ?? normalizedEmail,
            destination: normalizedEmail,
            secretToken: "",
            hasSecretToken: false,
            isEnabled: true,
            priority: value.isFallbackEnabled ? nextPriority(value) : null,
          },
        ],
      };
    });
  }

  function setFallbackEnabled(enabled: boolean) {
    edit((value) => {
      if (!enabled) return { ...value, isFallbackEnabled: false };
      let priority = Math.max(0, ...value.recipients.map((recipient) => recipient.priority ?? 0));
      return {
        ...value,
        isFallbackEnabled: true,
        recipients: value.recipients.map((recipient) =>
          recipient.isEnabled && recipient.priority === null
            ? { ...recipient, priority: ++priority }
            : recipient,
        ),
      };
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
    if (payload.isFallbackEnabled) {
      const priorityLevels = [
        ...new Set(payload.recipients
          .filter((recipient) => recipient.isEnabled)
          .map((recipient) => recipient.priority)),
      ].sort((left, right) => (left ?? 0) - (right ?? 0));
      if (priorityLevels.some((priority, index) => priority !== index + 1)) {
        setFeedback("Enabled priority levels must be consecutive from 1 (for example: 1, 1, 2).");
        return;
      }
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
              onChange={(event) => setFallbackEnabled(event.target.checked)}
              className="size-4 accent-blue-600"
            />
            Enable Fallback Routing
          </label>
          <p className="text-sm text-muted-foreground">
            {current.isFallbackEnabled
              ? "Try every destination at the same priority, then stop if any succeeds."
              : "Send to every enabled channel at the same time."}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {channels.filter((channel) => channel !== "email").map((channel) => (
          <Button key={channel} type="button" variant="outline" onClick={() => addRecipient(channel)}>
            <Plus className="size-4" /> Add {labels[channel]}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipientPicker
            users={usersQuery.data ?? []}
            emails={emailRecipients.map((recipient) => recipient.destination.trim().toLowerCase())}
            usersLoading={usersQuery.isLoading}
            usersUnavailable={usersQuery.isError}
            onAdd={addEmail}
          />
        </CardContent>
      </Card>

      {current.recipients.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No channels configured. Add a destination to begin.
        </p>
      )}

      {current.recipients.map((recipient) => {
        const ChannelIcon = channelIcons[recipient.channel];
        const systemUser = recipient.channel === "email"
          ? usersQuery.data?.find((user) => user.email.trim().toLowerCase() === recipient.destination.trim().toLowerCase())
          : undefined;
        return (
          <Card key={recipient.key}>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex size-8 items-center justify-center rounded-md ${channelIconStyles[recipient.channel]}`}>
                    <ChannelIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {labels[recipient.channel]}
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={recipient.isEnabled}
                      onChange={(event) => updateRecipient(recipient.key, {
                        isEnabled: event.target.checked,
                        priority: event.target.checked && recipient.priority === null
                          ? nextPriority(current)
                          : recipient.priority,
                      })}
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

              {recipient.channel === "email" && (
                <p className="text-xs text-muted-foreground">
                  {systemUser
                    ? `${systemUser.displayName} · ${systemUser.status === "ACTIVE" ? "System user" : "Inactive system user"}`
                    : "External email"}
                </p>
              )}

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
                  <label className="flex items-center gap-2 text-sm font-medium">
                    Priority
                    <select
                      aria-label={`Priority for ${recipient.name}`}
                      value={recipient.priority ?? ""}
                      onChange={(event) => updateRecipient(recipient.key, { priority: Number(event.target.value) })}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="" disabled>Select</option>
                      {Array.from({ length: priorityOptionCount }, (_, index) => index + 1).map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
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

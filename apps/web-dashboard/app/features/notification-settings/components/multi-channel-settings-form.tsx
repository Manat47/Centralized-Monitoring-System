"use client";

import { useEffect, useRef, useState } from "react";
import { Hash, LoaderCircle, Mail, MessageCircle, Plus, Send, Trash2, Webhook as WebhookIcon } from "lucide-react";

import { useAllUsers } from "@/app/features/users/api/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { DestinationEditor, type DestinationFormValues } from "./destination-editor";

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

interface DraftRecipient extends DestinationFormValues {
  key: string;
  recipientId?: string;
  hasSecretToken: boolean;
}

interface DraftSettings {
  isFallbackEnabled: boolean;
  recipients: DraftRecipient[];
}

type EditorState = { kind: "add" } | { kind: "edit"; key: string } | null;
type Notice = { kind: "info" | "success" | "error"; message: string } | null;

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
      ...(recipient.secretToken.trim() ? { secretToken: recipient.secretToken.trim() } : {}),
      isEnabled: recipient.isEnabled,
      priority: recipient.priority,
    })),
  };
}

function nextPriority(draft: DraftSettings): number {
  return Math.max(0, ...draft.recipients
    .filter((recipient) => recipient.isEnabled)
    .map((recipient) => recipient.priority ?? 0)) + 1;
}

function identity(recipient: Pick<DraftRecipient, "channel" | "destination">): string {
  return `${recipient.channel}:${recipient.channel === "email"
    ? recipient.destination.trim().toLowerCase()
    : recipient.destination.trim()}`;
}

function displayedDestination(recipient: DraftRecipient): string {
  if (recipient.channel === "email") return recipient.destination;
  if (recipient.channel === "line") {
    const value = recipient.destination.trim();
    return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "••••";
  }
  try {
    return `${new URL(recipient.destination).origin}/••••`;
  } catch {
    return "URL hidden";
  }
}

function NotificationSettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading notification settings" className="space-y-5">
      <span className="sr-only">Loading notification settings...</span>
      <Skeleton className="h-28 w-full" />
      <div className="flex justify-end gap-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-36" /></div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function MultiChannelSettingsForm() {
  const settingsQuery = useMultiChannelSettings();
  const saveMutation = useUpdateMultiChannelSettings();
  const testMutation = useTestNotificationChannel();
  const usersQuery = useAllUsers();
  const [draft, setDraft] = useState<DraftSettings | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [highlightIdentity, setHighlightIdentity] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState("");
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!highlightIdentity) return;
    const frame = requestAnimationFrame(() => {
      highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightIdentity, draft, settingsQuery.data]);

  if (settingsQuery.isLoading) return <NotificationSettingsSkeleton />;
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
  const editingRecipient = editor?.kind === "edit"
    ? current.recipients.find((recipient) => recipient.key === editor.key)
    : undefined;
  const otherDestinations = current.recipients
    .filter((recipient) => recipient.key !== editingRecipient?.key)
    .map((recipient) => ({ channel: recipient.channel, destination: recipient.destination }));
  const priorityOptionCount = Math.max(1, nextPriority(current));
  const priorityOptions = Array.from({ length: priorityOptionCount }, (_, index) => index + 1);
  const rows = [
    ...current.recipients.filter((recipient) => !recipient.recipientId).reverse(),
    ...current.recipients.filter((recipient) => recipient.recipientId),
  ];

  function edit(transform: (value: DraftSettings) => DraftSettings) {
    setDraft((value) => transform(value ?? makeDraft(saved)));
    setNotice(null);
  }

  function updateRecipient(key: string, patch: Partial<DraftRecipient>) {
    edit((value) => ({
      ...value,
      recipients: value.recipients.map((recipient) =>
        recipient.key === key ? { ...recipient, ...patch } : recipient),
    }));
  }

  function applyDestination(values: DestinationFormValues) {
    if (editor?.kind === "add") {
      edit((value) => ({
        ...value,
        recipients: [...value.recipients, {
          ...values,
          key: crypto.randomUUID(),
          hasSecretToken: false,
        }],
      }));
      setHighlightIdentity(identity(values));
      setNotice({ kind: "info", message: "Destination added to the list. Save Changes to apply it." });
    } else if (editor?.kind === "edit") {
      updateRecipient(editor.key, values);
      setHighlightIdentity(identity(values));
      setNotice({ kind: "info", message: "Edit added to pending changes. Save Changes to apply it." });
    }
    setEditor(null);
  }

  function setFallbackEnabled(enabled: boolean) {
    edit((value) => {
      if (!enabled) return { ...value, isFallbackEnabled: false };
      let priority = Math.max(0, ...value.recipients
        .filter((recipient) => recipient.isEnabled)
        .map((recipient) => recipient.priority ?? 0));
      return {
        ...value,
        isFallbackEnabled: true,
        recipients: value.recipients.map((recipient) =>
          recipient.isEnabled && recipient.priority === null
            ? { ...recipient, priority: ++priority }
            : recipient),
      };
    });
  }

  async function save() {
    const payload = toPayload(current);
    if (payload.recipients.some((recipient) => !recipient.name || !recipient.destination)) {
      setNotice({ kind: "error", message: "Enter a name and destination for every channel." });
      return;
    }
    if (payload.recipients.some((recipient) =>
      recipient.channel === "webhook" &&
      !recipient.secretToken &&
      !current.recipients.find((item) => item.recipientId === recipient.recipientId)?.hasSecretToken,
    )) {
      setNotice({ kind: "error", message: "Enter a signing secret for each new webhook." });
      return;
    }
    if (payload.isFallbackEnabled) {
      const levels = [...new Set(payload.recipients
        .filter((recipient) => recipient.isEnabled)
        .map((recipient) => recipient.priority))]
        .sort((left, right) => (left ?? 0) - (right ?? 0));
      if (levels.some((priority, index) => priority !== index + 1)) {
        setNotice({ kind: "error", message: "Enabled priority levels must be consecutive from 1 (for example: 1, 1, 2)." });
        return;
      }
    }
    try {
      await saveMutation.mutateAsync(payload);
      setDraft(null);
      setNotice({ kind: "success", message: "Notification settings saved. The changes now apply to alert delivery." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save notification settings.",
      });
    }
  }

  async function sendTest() {
    const recipient = saved.recipients.find((item) => item.recipientId === selectedTestId);
    if (!recipient) return;
    try {
      const result = await testMutation.mutateAsync(recipient.recipientId);
      setNotice(result.success
        ? { kind: "success", message: `${labels[recipient.channel]} test sent to ${recipient.name}.` }
        : { kind: "error", message: `${labels[recipient.channel]} test failed: ${result.errorMessage ?? "Provider unavailable"}` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Notification test failed." });
    } finally {
      setTestOpen(false);
    }
  }

  return (
    <div className="space-y-5">
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`sticky top-4 z-20 rounded-lg border px-4 py-3 text-sm shadow-sm ${notice.kind === "error"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            : notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"}`}
        >
          {notice.message}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Delivery routing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              role="switch"
              checked={current.isFallbackEnabled}
              disabled={Boolean(editor) || saveMutation.isPending}
              onChange={(event) => setFallbackEnabled(event.target.checked)}
              className="size-4 accent-blue-600"
            />
            Enable Fallback Routing
          </label>
          <p className="text-sm text-muted-foreground">
            {current.isFallbackEnabled
              ? "Try every enabled destination at the same priority, then stop if any succeeds. Table position does not control delivery order."
              : "Send to every enabled destination when an alert reaches this notification service."}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Global destinations · {current.recipients.length}/100 in list</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(editor) || current.recipients.length >= 100 || saveMutation.isPending}
            onClick={() => setEditor({ kind: "add" })}
          >
            <Plus className="size-4" /> Add destination
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(editor) || draft !== null || saved.recipients.length === 0 || saveMutation.isPending || testMutation.isPending}
            onClick={() => {
              setSelectedTestId(saved.recipients[0]?.recipientId ?? "");
              setTestOpen(true);
            }}
          >
            <Send className="size-4" /> Test notification
          </Button>
        </div>
      </div>
      {draft && <p className="text-sm text-amber-700 dark:text-amber-300">You have unsaved changes. Save or discard them before sending a test.</p>}

      {editor && (editor.kind === "add" || editingRecipient) && (
        <DestinationEditor
          key={editor.kind === "add" ? "add" : editor.key}
          initial={editingRecipient}
          hasSecretToken={editingRecipient?.hasSecretToken}
          users={usersQuery.data ?? []}
          usersUnavailable={usersQuery.isError}
          isFallbackEnabled={current.isFallbackEnabled}
          priorityOptions={priorityOptions}
          existingDestinations={otherDestinations}
          onSubmit={applyDestination}
          onCancel={() => setEditor(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Delivery destinations</CardTitle>
          <p className="text-sm text-muted-foreground">These destinations apply globally to alerts routed through this service. Display names do not create teams.</p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No destinations configured. Add a destination to begin.
            </p>
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((recipient) => {
                  const ChannelIcon = channelIcons[recipient.channel];
                  const highlighted = identity(recipient) === highlightIdentity;
                  return (
                    <TableRow
                      key={recipient.key}
                      ref={highlighted ? highlightRowRef : undefined}
                      className={highlighted ? "bg-blue-50/70 dark:bg-blue-950/30" : undefined}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className={`flex size-7 items-center justify-center rounded-md ${channelIconStyles[recipient.channel]}`}>
                            <ChannelIcon className="size-4" aria-hidden="true" />
                          </span>
                          {labels[recipient.channel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{recipient.name}</span>
                        {!recipient.recipientId && <Badge variant="secondary" className="ml-2">Not saved</Badge>}
                      </TableCell>
                      <TableCell className="max-w-60 truncate" title={recipient.channel === "email" ? recipient.destination : undefined}>
                        {displayedDestination(recipient)}
                      </TableCell>
                      <TableCell>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={recipient.isEnabled}
                            disabled={Boolean(editor) || saveMutation.isPending}
                            onChange={(event) => updateRecipient(recipient.key, {
                              isEnabled: event.target.checked,
                              priority: event.target.checked && current.isFallbackEnabled &&
                                (recipient.priority === null || recipient.priority > nextPriority(current))
                                ? nextPriority(current)
                                : recipient.priority,
                            })}
                            className="size-4 accent-blue-600"
                            aria-label={`Enable ${recipient.name}`}
                          />
                          <span>{recipient.isEnabled ? "On" : "Off"}</span>
                        </label>
                      </TableCell>
                      <TableCell>{current.isFallbackEnabled && recipient.isEnabled ? recipient.priority ?? "—" : "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={Boolean(editor) || saveMutation.isPending}
                            onClick={() => setEditor({ kind: "edit", key: recipient.key })}
                          >Edit</Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={Boolean(editor) || saveMutation.isPending}
                            onClick={() => {
                              edit((value) => ({
                                ...value,
                                recipients: value.recipients.filter((item) => item.key !== recipient.key),
                              }));
                              if (highlighted) setHighlightIdentity(null);
                              setNotice({ kind: "info", message: "Destination removed from the list. Save Changes to apply it." });
                            }}
                            aria-label={`Remove ${recipient.name}`}
                          >
                            <Trash2 className="size-4" /> Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!draft || saveMutation.isPending}
          onClick={() => {
            setDraft(null);
            setEditor(null);
            setNotice(null);
            setHighlightIdentity(null);
          }}
        >Discard</Button>
        <Button
          type="button"
          disabled={!draft || Boolean(editor) || saveMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
          onClick={save}
        >
          {saveMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Test notification</DialogTitle>
            <DialogDescription>Send one real test message to a saved destination. Disabled destinations can also be tested.</DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-sm font-medium">
            <span>Destination to test</span>
            <select
              value={selectedTestId}
              onChange={(event) => setSelectedTestId(event.target.value)}
              className="block h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {saved.recipients.map((recipient) => (
                <option key={recipient.recipientId} value={recipient.recipientId}>
                  {labels[recipient.channel]} · {recipient.name}{recipient.isEnabled ? "" : " (disabled)"}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={testMutation.isPending} onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!selectedTestId || testMutation.isPending} onClick={sendTest}>
              {testMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

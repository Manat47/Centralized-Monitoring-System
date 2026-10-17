"use client";

import { useEffect, useState } from "react";
import { Hash, LoaderCircle, Mail, MessageCircle, Plus, Search, Send, Trash2, Webhook as WebhookIcon, X } from "lucide-react";

import { useAllUsers } from "@/app/features/users/api/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCreateNotificationChannel,
  useDeleteNotificationChannel,
  useMultiChannelSettings,
  usePatchNotificationChannel,
  usePatchNotificationRouting,
  useTestNotificationChannel,
} from "../api/use-notification-settings";
import type { NotificationChannel, NotificationChannelRecipient } from "../types/notification-settings";
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
const blueButton = "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700";

type EditorState = { kind: "add" } | { kind: "edit"; recipientId: string } | null;
type Notice = { kind: "success" | "error"; message: string } | null;

function displayedDestination(recipient: NotificationChannelRecipient): string {
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function NotificationSettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading notification settings" className="space-y-5">
      <span className="sr-only">Loading notification settings...</span>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function MultiChannelSettingsForm() {
  const settingsQuery = useMultiChannelSettings();
  const usersQuery = useAllUsers();
  const createMutation = useCreateNotificationChannel();
  const patchMutation = usePatchNotificationChannel();
  const deleteMutation = useDeleteNotificationChannel();
  const routingMutation = usePatchNotificationRouting();
  const testMutation = useTestNotificationChannel();
  const [editor, setEditor] = useState<EditorState>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<NotificationChannel | "">("");
  const [testSearch, setTestSearch] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");

  useEffect(() => {
    if (notice?.kind !== "success") return;
    const timer = window.setTimeout(() => setNotice((current) => current === notice ? null : current), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 5000);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const busy = createMutation.isPending || patchMutation.isPending || deleteMutation.isPending || routingMutation.isPending;

  if (settingsQuery.isLoading) return <NotificationSettingsSkeleton />;
  if (settingsQuery.isError) {
    return <p role="alert" className="text-sm text-destructive">{errorMessage(settingsQuery.error, "Failed to load notification settings")}</p>;
  }

  const saved = settingsQuery.data ?? { isFallbackEnabled: false, recipients: [] };
  const editingRecipient = editor?.kind === "edit"
    ? saved.recipients.find((recipient) => recipient.recipientId === editor.recipientId)
    : undefined;
  const removingRecipient = saved.recipients.find((recipient) => recipient.recipientId === removeId);
  const initialValues: DestinationFormValues | undefined = editingRecipient && {
    channel: editingRecipient.channel,
    name: editingRecipient.name,
    destination: editingRecipient.destination,
    secretToken: "",
    isEnabled: editingRecipient.isEnabled,
    priority: editingRecipient.priority,
  };
  const otherDestinations = saved.recipients
    .filter((recipient) => recipient.recipientId !== editingRecipient?.recipientId)
    .map((recipient) => ({ channel: recipient.channel, destination: recipient.destination }));
  const lastPriority = Math.max(0, ...saved.recipients.filter((recipient) => recipient.isEnabled).map((recipient) => recipient.priority ?? 0));
  const priorityOptions = Array.from({ length: lastPriority + 1 || 1 }, (_, index) => index + 1);
  const rows = [...saved.recipients].sort((left, right) => {
    if (left.recipientId === recentlyAddedId) return -1;
    if (right.recipientId === recentlyAddedId) return 1;
    return (left.priority ?? 9999) - (right.priority ?? 9999);
  });
  const selectedTestRecipient = saved.recipients.find((recipient) => recipient.recipientId === selectedTestId);
  const normalizedSearch = testSearch.trim().toLowerCase();
  const testMatches = saved.recipients
    .filter((recipient) => recipient.channel === testChannel)
    .filter((recipient) =>
      !normalizedSearch || recipient.name.toLowerCase().includes(normalizedSearch) || recipient.destination.toLowerCase().includes(normalizedSearch),
    )
    .slice(0, 8);

  async function saveDestination(values: DestinationFormValues) {
    if (!editor || busy) return;
    const patch = {
      name: values.name,
      destination: values.destination,
      ...(values.secretToken ? { secretToken: values.secretToken } : {}),
      isEnabled: values.isEnabled,
      priority: values.priority,
    };
    try {
      if (editor.kind === "add") {
        const result = await createMutation.mutateAsync({ channel: values.channel, ...patch });
        const created = result.recipients.find((recipient) =>
          recipient.channel === values.channel &&
          recipient.destination === (values.channel === "email" ? values.destination.toLowerCase() : values.destination),
        );
        setRecentlyAddedId(created?.recipientId ?? null);
        setHighlightId(created?.recipientId ?? null);
        setNotice({ kind: "success", message: "Destination added and ready for alert delivery." });
      } else {
        await patchMutation.mutateAsync({ recipientId: editor.recipientId, patch });
        setNotice({ kind: "success", message: "Destination updated." });
      }
      setEditor(null);
    } catch (error) {
      setNotice({ kind: "error", message: errorMessage(error, "Failed to save destination.") });
    }
  }

  async function toggleRecipient(recipient: NotificationChannelRecipient, isEnabled: boolean) {
    if (busy) return;
    setActiveOperation(recipient.recipientId);
    try {
      await patchMutation.mutateAsync({ recipientId: recipient.recipientId, patch: { isEnabled } });
      setNotice({ kind: "success", message: `${recipient.name} ${isEnabled ? "enabled" : "disabled"}.` });
    } catch (error) {
      setNotice({ kind: "error", message: errorMessage(error, "Failed to change destination status.") });
    } finally {
      setActiveOperation(null);
    }
  }

  async function toggleRouting(isFallbackEnabled: boolean) {
    if (busy) return;
    setActiveOperation("routing");
    try {
      await routingMutation.mutateAsync(isFallbackEnabled);
      setNotice({ kind: "success", message: `${isFallbackEnabled ? "Fallback" : "Broadcast"} routing enabled.` });
    } catch (error) {
      setNotice({ kind: "error", message: errorMessage(error, "Failed to change routing mode.") });
    } finally {
      setActiveOperation(null);
    }
  }

  async function removeRecipient() {
    if (!removeId || busy) return;
    setActiveOperation(removeId);
    try {
      await deleteMutation.mutateAsync(removeId);
      if (recentlyAddedId === removeId) setRecentlyAddedId(null);
      setRemoveId(null);
      setNotice({ kind: "success", message: "Destination removed." });
    } catch (error) {
      setNotice({ kind: "error", message: errorMessage(error, "Failed to remove destination.") });
    } finally {
      setActiveOperation(null);
    }
  }

  function openTest() {
    setTestChannel("");
    setTestSearch("");
    setSelectedTestId("");
    setTestOpen(true);
  }

  async function sendTest() {
    if (!selectedTestRecipient || testMutation.isPending) return;
    try {
      const result = await testMutation.mutateAsync(selectedTestRecipient.recipientId);
      if (result.success) {
        setNotice({ kind: "success", message: `${labels[selectedTestRecipient.channel]} test sent to ${selectedTestRecipient.name}.` });
        setTestOpen(false);
      } else {
        setNotice({ kind: "error", message: `${labels[selectedTestRecipient.channel]} test failed: ${result.errorMessage ?? "Provider unavailable"}` });
      }
    } catch (error) {
      setNotice({ kind: "error", message: errorMessage(error, "Notification test failed.") });
    }
  }

  return (
    <div>
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`fixed right-4 top-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg dark:bg-slate-950 ${notice.kind === "error" ? "border-red-200 text-red-800 dark:border-red-900 dark:text-red-200" : "border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-200"}`}
        >
          <span className="min-w-0 flex-1">{notice.message}</span>
          {notice.kind === "error" && (
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss error" className="rounded p-0.5 hover:bg-red-50 dark:hover:bg-red-950/40">
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Delivery destinations</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Global settings for alerts routed through this service · {saved.recipients.length}/100 destinations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy || saved.recipients.length === 0 || testMutation.isPending} onClick={openTest}>
                <Send className="size-4" /> Test notification
              </Button>
              <Button type="button" className={blueButton} disabled={busy || saved.recipients.length >= 100} onClick={() => setEditor({ kind: "add" })}>
                <Plus className="size-4" /> Add destination
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <label className="inline-flex items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" role="switch" checked={saved.isFallbackEnabled} disabled={busy} onChange={(event) => void toggleRouting(event.target.checked)} className="size-4 accent-blue-600" />
              Fallback routing
              {activeOperation === "routing" && <LoaderCircle className="size-4 animate-spin text-blue-600" aria-label="Saving routing mode" />}
            </label>
            <p className="text-xs text-muted-foreground">
              {saved.isFallbackEnabled
                ? "Try all enabled destinations at the same priority. Continue to the next priority only if all fail."
                : "Broadcast: send to every enabled destination."}
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="m-4 rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground dark:border-slate-800">No destinations configured. Add a destination to begin.</p>
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
                  return (
                    <TableRow key={recipient.recipientId} className={recipient.recipientId === highlightId ? "bg-blue-50/70 dark:bg-blue-950/30" : "hover:bg-slate-50/70 dark:hover:bg-slate-900/40"}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ChannelIcon className="size-4" aria-hidden="true" /></span>
                          {labels[recipient.channel]}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{recipient.name}</TableCell>
                      <TableCell className="max-w-60 truncate" title={recipient.channel === "email" ? recipient.destination : undefined}>{displayedDestination(recipient)}</TableCell>
                      <TableCell>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" role="switch" checked={recipient.isEnabled} disabled={busy} onChange={(event) => void toggleRecipient(recipient, event.target.checked)} className="size-4 accent-blue-600" aria-label={`Enable ${recipient.name}`} />
                          <span>{recipient.isEnabled ? "On" : "Off"}</span>
                          {activeOperation === recipient.recipientId && <LoaderCircle className="size-4 animate-spin text-blue-600" aria-label="Saving destination" />}
                        </label>
                      </TableCell>
                      <TableCell>{saved.isFallbackEnabled && recipient.isEnabled ? recipient.priority ?? "—" : "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setEditor({ kind: "edit", recipientId: recipient.recipientId })}>Edit</Button>
                          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setRemoveId(recipient.recipientId)} aria-label={`Remove ${recipient.name}`}><Trash2 className="size-4" /> Remove</Button>
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

      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !busy) setEditor(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editor?.kind === "edit" ? "Edit destination" : "Add destination"}</DialogTitle>
            <DialogDescription className="sr-only">Configure a destination for alert notifications.</DialogDescription>
          </DialogHeader>
          {editor && (editor.kind === "add" || editingRecipient) && (
            <DestinationEditor
              key={editor.kind === "add" ? "add" : editor.recipientId}
              initial={initialValues}
              hasSecretToken={editingRecipient?.hasSecretToken}
              users={usersQuery.data ?? []}
              usersUnavailable={usersQuery.isError}
              isFallbackEnabled={saved.isFallbackEnabled}
              priorityOptions={priorityOptions}
              existingDestinations={otherDestinations}
              onSubmit={(values) => void saveDestination(values)}
              onCancel={() => setEditor(null)}
              isSaving={createMutation.isPending || (patchMutation.isPending && !activeOperation)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={removeId !== null} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setRemoveId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove destination?</DialogTitle>
            <DialogDescription>{removingRecipient ? `${removingRecipient.name} will stop receiving new alerts.` : "This destination will stop receiving new alerts."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => setRemoveId(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => void removeRecipient()}>
              {deleteMutation.isPending && <LoaderCircle className="size-4 animate-spin" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={(open) => { if (!testMutation.isPending) setTestOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Test notification</DialogTitle>
            <DialogDescription>Send one real test message to a saved destination. Disabled destinations can also be tested.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5 text-sm font-medium">
              <span id="test-channel-label">Channel</span>
              <Select value={testChannel} onValueChange={(channel) => {
                setTestChannel((channel ?? "") as NotificationChannel | "");
                setTestSearch("");
                setSelectedTestId("");
              }}>
                <SelectTrigger aria-labelledby="test-channel-label" className="h-9 w-full"><SelectValue>{testChannel ? labels[testChannel] : "Select a channel"}</SelectValue></SelectTrigger>
                <SelectContent alignItemWithTrigger={false} sideOffset={6}>
                  {(Object.keys(labels) as NotificationChannel[]).map((channel) => (
                    <SelectItem key={channel} value={channel}>{labels[channel]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {testChannel && (
              <div className="space-y-2">
                <label htmlFor="test-destination-search" className="text-sm font-medium">Destination</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="test-destination-search" value={testSearch} onChange={(event) => {
                    setTestSearch(event.target.value);
                    setSelectedTestId("");
                  }} placeholder="Search name or destination" className="h-9 pl-9" />
                </div>
                <div role="listbox" aria-label="Destinations to test" className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1 dark:border-slate-800">
                  {testMatches.map((recipient) => (
                    <button key={recipient.recipientId} type="button" role="option" aria-selected={selectedTestId === recipient.recipientId} onClick={() => setSelectedTestId(recipient.recipientId)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selectedTestId === recipient.recipientId ? "bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-800" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{recipient.name}</span><span className="block truncate text-xs text-muted-foreground">{displayedDestination(recipient)}</span></span>
                      <Badge variant="outline" className={recipient.isEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>{recipient.isEnabled ? "Enabled" : "Disabled"}</Badge>
                    </button>
                  ))}
                  {testMatches.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No matching destinations in this channel.</p>}
                </div>
                {testMatches.length === 8 && <p className="text-xs text-muted-foreground">Showing up to 8 results. Search to narrow the list.</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={testMutation.isPending} onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button type="button" className={blueButton} disabled={!selectedTestRecipient || testMutation.isPending} onClick={() => void sendTest()}>
              {testMutation.isPending && <LoaderCircle className="size-4 animate-spin" />} Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

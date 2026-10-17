"use client";

import { useState, type FormEvent } from "react";

import type { User } from "@/app/features/users/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { NotificationChannel } from "../types/notification-settings";

export interface DestinationFormValues {
  channel: NotificationChannel;
  name: string;
  destination: string;
  secretToken: string;
  isEnabled: boolean;
  priority: number | null;
}

interface DestinationEditorProps {
  initial?: DestinationFormValues;
  hasSecretToken?: boolean;
  users: User[];
  usersUnavailable: boolean;
  isFallbackEnabled: boolean;
  priorityOptions: number[];
  existingDestinations: Array<{ channel: NotificationChannel; destination: string }>;
  onSubmit: (values: DestinationFormValues) => void;
  onCancel: () => void;
}

const channelCopy: Record<NotificationChannel, {
  label: string;
  destinationLabel: string;
  placeholder: string;
  help: string;
}> = {
  email: {
    label: "Email",
    destinationLabel: "Recipient email",
    placeholder: "recipient@example.com",
    help: "Choose an active system user or enter an external email address.",
  },
  line: {
    label: "LINE",
    destinationLabel: "LINE recipient ID",
    placeholder: "LINE user or group ID",
    help: "Enter the recipient's User ID or Group ID, not their LINE name or Channel ID.",
  },
  slack: {
    label: "Slack",
    destinationLabel: "Slack Incoming Webhook URL",
    placeholder: "https://hooks.slack.com/services/...",
    help: "Paste an Incoming Webhook URL, not a workspace or channel name.",
  },
  webhook: {
    label: "Webhook",
    destinationLabel: "Destination URL",
    placeholder: "https://example.com/notifications",
    help: "The system POSTs alert JSON to this URL. Your endpoint can verify the signature using the secret below.",
  },
};

export function DestinationEditor({
  initial,
  hasSecretToken = false,
  users,
  usersUnavailable,
  isFallbackEnabled,
  priorityOptions,
  existingDestinations,
  onSubmit,
  onCancel,
}: DestinationEditorProps) {
  const [values, setValues] = useState<DestinationFormValues>(() => initial ?? {
    channel: "email",
    name: "",
    destination: "",
    secretToken: "",
    isEnabled: true,
    priority: isFallbackEnabled ? priorityOptions.at(-1) ?? 1 : null,
  });
  const [error, setError] = useState<string | null>(null);
  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const copy = channelCopy[values.channel];

  function change(patch: Partial<DestinationFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = values.destination.trim();
    const systemUser = values.channel === "email"
      ? activeUsers.find((user) => user.email.toLowerCase() === destination.toLowerCase())
      : undefined;
    const name = values.name.trim() || (values.channel === "email"
      ? systemUser?.displayName ?? destination.toLowerCase()
      : "");

    if (!name || !destination) {
      setError("Enter a display name and destination.");
      return;
    }
    if (values.channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
      setError("Enter a valid recipient email address.");
      return;
    }
    if (values.channel === "slack" || values.channel === "webhook") {
      try {
        const url = new URL(destination);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol");
      } catch {
        setError("Enter a valid HTTP or HTTPS URL.");
        return;
      }
    }
    if (values.channel === "webhook" && !values.secretToken.trim() && !hasSecretToken) {
      setError("Enter a signing secret for the new webhook.");
      return;
    }
    if (isFallbackEnabled && values.isEnabled && !values.priority) {
      setError("Select a fallback priority.");
      return;
    }
    const normalizedDestination = values.channel === "email"
      ? destination.toLowerCase()
      : destination;
    if (existingDestinations.some((item) =>
      item.channel === values.channel &&
      (item.channel === "email" ? item.destination.toLowerCase() : item.destination) === normalizedDestination,
    )) {
      setError("This destination is already in the list.");
      return;
    }

    onSubmit({
      ...values,
      name,
      destination: normalizedDestination,
      secretToken: values.secretToken.trim(),
      priority: isFallbackEnabled && values.isEnabled
        ? values.priority ?? priorityOptions.at(-1) ?? 1
        : values.priority,
    });
  }

  return (
    <section className="space-y-4" aria-label={initial ? "Edit destination" : "Add destination"}>
      <div>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">
          {initial ? "Edit destination" : "Add destination"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {initial
            ? "Apply the edit to the list, then Save Changes to update global alert delivery."
            : "Add to the list first, then Save Changes to apply it to global alert delivery."}
        </p>
      </div>
      <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Channel</span>
              <Select
                value={values.channel}
                disabled={Boolean(initial)}
                onValueChange={(channel) => change({
                  channel: (channel ?? "email") as NotificationChannel,
                  name: "",
                  destination: "",
                  secretToken: "",
                })}
              >
                <SelectTrigger aria-label="Channel" className="h-9 w-full bg-white dark:bg-slate-950">
                  <SelectValue>{copy.label}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} sideOffset={6}>
                  {Object.entries(channelCopy).map(([channel, item]) => (
                    <SelectItem key={channel} value={channel}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Display name {values.channel === "email" && <span className="font-normal text-muted-foreground">(optional)</span>}</span>
              <Input
                value={values.name}
                onChange={(event) => change({ name: event.target.value })}
                placeholder={values.channel === "email" ? "Defaults to user name or email" : "e.g. Operations"}
                maxLength={120}
                required={values.channel !== "email"}
                className="h-9 bg-white focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:bg-slate-950"
              />
              <span className="block text-xs font-normal text-muted-foreground">For identifying this row only; it does not select a team.</span>
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>{copy.destinationLabel}</span>
            <Input
              value={values.destination}
              onChange={(event) => change({ destination: event.target.value })}
              placeholder={copy.placeholder}
              list={values.channel === "email" ? "notification-active-users" : undefined}
              maxLength={2048}
              required
              autoComplete="off"
              className="h-9 bg-white focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:bg-slate-950"
            />
            <span className="block text-xs font-normal text-muted-foreground">{copy.help}</span>
          </label>
          {values.channel === "email" && (
            <>
              <datalist id="notification-active-users">
                {activeUsers.map((user) => (
                  <option key={user.userId} value={user.email} label={user.displayName} />
                ))}
              </datalist>
              {usersUnavailable && (
                <p className="text-xs text-amber-700">System users could not be loaded. You can still enter an external email.</p>
              )}
            </>
          )}

          {values.channel === "webhook" && (
            <label className="block space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Signing secret</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={values.secretToken}
                onChange={(event) => change({ secretToken: event.target.value })}
                placeholder={hasSecretToken ? "Configured — leave blank to keep" : "Enter a signing secret"}
                maxLength={4096}
                className="h-9 bg-white focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:bg-slate-950"
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Used to sign the JSON request. An existing secret is kept when this field is left blank.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-end gap-5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                role="switch"
                checked={values.isEnabled}
                onChange={(event) => change({
                  isEnabled: event.target.checked,
                  priority: event.target.checked && isFallbackEnabled &&
                    (values.priority === null || values.priority > (priorityOptions.at(-1) ?? 1))
                    ? priorityOptions.at(-1) ?? 1
                    : values.priority,
                })}
                className="size-4 accent-blue-600"
              />
              Enabled
            </label>
            {isFallbackEnabled && values.isEnabled && (
              <label className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Fallback priority</span>
                <Select
                  value={String(values.priority ?? "")}
                  onValueChange={(priority) => change({ priority: priority ? Number(priority) : null })}
                >
                  <SelectTrigger aria-label="Fallback priority" className="h-9 min-w-36 bg-white dark:bg-slate-950">
                    <SelectValue>{values.priority ?? "Select"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} sideOffset={6}>
                    {priorityOptions.map((priority) => <SelectItem key={priority} value={String(priority)}>{priority}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700">
              {initial ? "Apply edit to list" : "Add to list"}
            </Button>
          </div>
      </form>
    </section>
  );
}

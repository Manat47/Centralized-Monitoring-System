"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Mail, Plus, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  useNotificationRecipients,
  useSendTestNotification,
  useUpdateNotificationRecipients,
} from "../api/use-notification-settings";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NotificationSettingsForm() {
  const recipientsQuery = useNotificationRecipients();
  const updateMutation = useUpdateNotificationRecipients();
  const testMutation = useSendTestNotification();
  const [draftEmails, setDraftEmails] = useState<string[] | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const savedEmails = useMemo(
    () => recipientsQuery.data?.map((recipient) => recipient.email) ?? [],
    [recipientsQuery.data],
  );

  const emails = draftEmails ?? savedEmails;
  const hasChanges = JSON.stringify(emails) !== JSON.stringify(savedEmails);
  const normalizedDraft = draftEmail.trim().toLowerCase();
  const canAdd =
    emailPattern.test(normalizedDraft) && !emails.includes(normalizedDraft);

  function clearFeedback() {
    setValidationError(null);
    setSavedMessage(null);
    updateMutation.reset();
    testMutation.reset();
  }

  function addEmail(event?: FormEvent) {
    event?.preventDefault();
    clearFeedback();

    if (!normalizedDraft) {
      setValidationError("Enter an email address.");
      return;
    }

    if (!emailPattern.test(normalizedDraft)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (emails.includes(normalizedDraft)) {
      setValidationError("This email address is already configured.");
      return;
    }

    setDraftEmails([...emails, normalizedDraft]);
    setDraftEmail("");
  }

  function removeEmail(email: string) {
    clearFeedback();
    setDraftEmails(emails.filter((item) => item !== email));
  }

  function discardChanges() {
    clearFeedback();
    setDraftEmails(null);
    setDraftEmail("");
  }

  async function saveChanges() {
    clearFeedback();

    try {
      await updateMutation.mutateAsync(emails);
      setDraftEmails(null);
      setSavedMessage("Notification recipients saved.");
    } catch {
      // Mutation error is rendered below.
    }
  }

  async function sendTest() {
    clearFeedback();

    try {
      const result = await testMutation.mutateAsync();
      setSavedMessage(
        result.failedCount === 0
          ? `Test email sent to ${result.sentCount} ${result.sentCount === 1 ? "recipient" : "recipients"}.`
          : `Test email sent to ${result.sentCount}; ${result.failedCount} failed.`,
      );
    } catch {
      // Mutation error is rendered below.
    }
  }

  if (recipientsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading notification settings...
        </CardContent>
      </Card>
    );
  }

  if (recipientsQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium text-destructive">
            Failed to load notification settings
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {recipientsQuery.error instanceof Error
              ? recipientsQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const mutationError = updateMutation.error ?? testMutation.error;

  return (
    <div className="space-y-5">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-primary" />
            <div>
              <CardTitle>Email Recipients</CardTitle>
              <CardDescription>
                Alert notifications are sent to the email addresses listed below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 py-5">
          {emails.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Configured recipients">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex h-8 max-w-full items-center gap-2 rounded-md border bg-muted/40 px-3 font-mono text-sm"
                >
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${email}`}
                    title={`Remove ${email}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              No recipients configured. Alert emails are currently disabled.
            </p>
          )}

          <form onSubmit={addEmail} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={draftEmail}
                onChange={(event) => {
                  setDraftEmail(event.target.value);
                  setValidationError(null);
                }}
                placeholder="Enter email address"
                className="h-10 pl-9"
                aria-invalid={Boolean(validationError)}
              />
            </div>
            <Button type="submit" size="lg" disabled={!canAdd}>
              <Plus className="size-4" />
              Add
            </Button>
          </form>

          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
          {mutationError && (
            <p className="text-sm text-destructive" role="alert">
              {mutationError instanceof Error
                ? mutationError.message
                : "Notification settings operation failed"}
            </p>
          )}
          {savedMessage && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700" role="status">
              <Check className="size-4" />
              {savedMessage}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col justify-between gap-3 sm:flex-row">
          <div>
            <p className="text-sm text-muted-foreground">
              {emails.length} {emails.length === 1 ? "recipient" : "recipients"} configured
            </p>
            {hasChanges && (
              <p className="text-xs text-amber-700">
                Save changes before sending a test email.
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={sendTest}
              disabled={
                hasChanges ||
                savedEmails.length === 0 ||
                testMutation.isPending ||
                updateMutation.isPending
              }
            >
              {testMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {testMutation.isPending ? "Sending..." : "Send test email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={discardChanges}
              disabled={!hasChanges || updateMutation.isPending}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={saveChanges}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <p className="text-sm text-muted-foreground">
        Recipients are delivery destinations only and do not need a system account.
        Channel: <span className="font-medium text-foreground">Email (Gmail SMTP)</span>.
      </p>
    </div>
  );
}

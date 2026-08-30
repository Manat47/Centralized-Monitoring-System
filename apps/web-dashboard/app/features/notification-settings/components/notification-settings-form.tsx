"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle, Mail, Send, UserRound, X } from "lucide-react";

import { useAllUsers } from "@/app/features/users/api/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationRecipients,
  useSendTestNotification,
  useUpdateNotificationRecipients,
} from "../api/use-notification-settings";
import { RecipientPicker } from "./recipient-picker";

export function NotificationSettingsForm() {
  const recipientsQuery = useNotificationRecipients();
  const updateMutation = useUpdateNotificationRecipients();
  const testMutation = useSendTestNotification();
  const usersQuery = useAllUsers();
  const [draftEmails, setDraftEmails] = useState<string[] | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const savedEmails = useMemo(
    () => recipientsQuery.data?.map((recipient) => recipient.email) ?? [],
    [recipientsQuery.data],
  );

  const emails = draftEmails ?? savedEmails;
  const hasChanges = JSON.stringify(emails) !== JSON.stringify(savedEmails);
  const usersByEmail = useMemo(
    () =>
      new Map(
        (usersQuery.data ?? []).map((user) => [
          user.email.trim().toLowerCase(),
          user,
        ]),
      ),
    [usersQuery.data],
  );

  function clearFeedback() {
    setSavedMessage(null);
    updateMutation.reset();
    testMutation.reset();
  }

  function addEmail(email: string) {
    clearFeedback();
    setDraftEmails([...emails, email]);
  }

  function removeEmail(email: string) {
    clearFeedback();
    setDraftEmails(emails.filter((item) => item !== email));
  }

  function discardChanges() {
    clearFeedback();
    setDraftEmails(null);
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
      <Card className="gap-0 py-0">
        <CardHeader className="space-y-2 border-b py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-14 w-64 max-w-full" />
            <Skeleton className="h-14 w-64 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-72 max-w-full" />
        </CardFooter>
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
                Alert notifications are sent to the email addresses listed
                below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 py-5">
          {emails.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Configured recipients"
            >
              {emails.map((email) =>
                (() => {
                  const user = usersByEmail.get(email);

                  return (
                    <div
                      key={email}
                      className="flex max-w-full items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
                    >
                      {user ? (
                        <UserRound className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Mail className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        {user && (
                          <span className="block truncate font-medium">
                            {user.displayName}
                          </span>
                        )}
                        <span className="block truncate text-sm text-muted-foreground">
                          {email}
                        </span>
                      </span>
                      <Badge
                        variant="outline"
                        className="hidden sm:inline-flex"
                      >
                        {user ? "System user" : "External"}
                      </Badge>
                      {user?.status === "INACTIVE" && (
                        <Badge variant="destructive">Inactive user</Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="
  shrink-0 rounded-sm
  text-muted-foreground
  transition-[color,background-color] duration-150
  hover:bg-red-50 hover:text-red-600
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-red-500/20
"
                        aria-label={`Remove ${email}`}
                        title={`Remove ${email}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  );
                })(),
              )}
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              No recipients configured. Alert emails are currently disabled.
            </p>
          )}

          <RecipientPicker
            users={usersQuery.data ?? []}
            emails={emails}
            usersLoading={usersQuery.isLoading}
            usersUnavailable={usersQuery.isError}
            onAdd={addEmail}
          />
          {mutationError && (
            <p className="text-sm text-destructive" role="alert">
              {mutationError instanceof Error
                ? mutationError.message
                : "Notification settings operation failed"}
            </p>
          )}
          {savedMessage && (
            <p
              className="flex items-center gap-1.5 text-sm text-emerald-700"
              role="status"
            >
              <Check className="size-4" />
              {savedMessage}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col justify-between gap-3 sm:flex-row">
          <div>
            <p className="text-sm text-muted-foreground">
              {emails.length} {emails.length === 1 ? "recipient" : "recipients"}{" "}
              configured
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
              aria-busy={testMutation.isPending}
              className="min-w-[8.75rem]"
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
              className="min-w-[5rem]"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={saveChanges}
              disabled={!hasChanges || updateMutation.isPending}
              aria-busy={updateMutation.isPending}
              className="
    min-w-[8rem]
    bg-blue-600 text-white
    transition-[background-color,transform] duration-150
    hover:bg-blue-700
    active:scale-[0.99] active:bg-blue-800
  "
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
        Recipients are delivery destinations only and do not need a system
        account. Channel:{" "}
        <span className="font-medium text-foreground">Email (Gmail SMTP)</span>.
      </p>
    </div>
  );
}

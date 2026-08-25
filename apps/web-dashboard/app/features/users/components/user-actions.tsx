"use client";

import { useState } from "react";
import { Ban, Mail, Power, PowerOff } from "lucide-react";

import { useAuth } from "@/app/features/auth/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useResendUserInvitation,
  useRevokeUserInvitation,
  useUpdateUserStatus,
} from "../api/use-user-actions";
import type { User } from "../types/user";
import { EditUserDialog } from "./edit-user-dialog";

interface UserActionsProps {
  user: User;
}

type ConfirmationAction = "STATUS" | "RESEND" | "REVOKE" | null;

export function UserActions({ user }: UserActionsProps) {
  const { user: currentUser } = useAuth();
  const statusMutation = useUpdateUserStatus();
  const resendMutation = useResendUserInvitation();
  const revokeMutation = useRevokeUserInvitation();
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction>(null);

  const isCurrentUser = currentUser?.userId === user.userId;
  const isInvitation =
    user.invitationStatus !== null && user.invitationStatus !== "ACCEPTED";
  const activating = user.status === "INACTIVE";
  const activeMutation =
    confirmationAction === "RESEND"
      ? resendMutation
      : confirmationAction === "REVOKE"
        ? revokeMutation
        : statusMutation;

  async function handleConfirm(): Promise<void> {
    try {
      if (confirmationAction === "RESEND") {
        await resendMutation.mutateAsync(user.userId);
      } else if (confirmationAction === "REVOKE") {
        await revokeMutation.mutateAsync(user.userId);
      } else if (confirmationAction === "STATUS") {
        await statusMutation.mutateAsync({
          userId: user.userId,
          input: { status: activating ? "ACTIVE" : "INACTIVE" },
        });
      }

      setConfirmationAction(null);
    } catch {
      // The active mutation error is rendered in the confirmation dialog.
    }
  }

  const dialogCopy =
    confirmationAction === "RESEND"
      ? {
          title: "Resend invitation",
          description:
            "The previous setup link will stop working and a new link will be emailed.",
          confirm: "Resend invitation",
        }
      : confirmationAction === "REVOKE"
        ? {
            title: "Revoke invitation",
            description:
              "The current setup link will stop working. The account can be invited again later.",
            confirm: "Revoke invitation",
          }
        : {
            title: activating ? "Activate user" : "Deactivate user",
            description: activating
              ? `${user.displayName} will be able to sign in again.`
              : `${user.displayName} will lose access. Existing refresh sessions will be revoked.`,
            confirm: activating ? "Activate user" : "Deactivate user",
          };

  return (
    <>
      <div className="flex justify-end gap-2">
        <EditUserDialog user={user} isCurrentUser={isCurrentUser} />

        {isInvitation ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={resendMutation.isPending || revokeMutation.isPending}
              onClick={() => setConfirmationAction("RESEND")}
            >
              <Mail className="size-4" />
              Resend
            </Button>
            {user.invitationStatus !== "REVOKED" && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={resendMutation.isPending || revokeMutation.isPending}
                onClick={() => setConfirmationAction("REVOKE")}
                title={`Revoke invitation for ${user.displayName}`}
              >
                <Ban className="size-4" />
                <span className="sr-only">Revoke invitation</span>
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={user.status === "ACTIVE" ? "destructive" : "outline"}
            disabled={statusMutation.isPending || isCurrentUser}
            onClick={() => setConfirmationAction("STATUS")}
            title={
              isCurrentUser
                ? "You cannot deactivate your own account"
                : activating
                  ? `Activate ${user.displayName}`
                  : `Deactivate ${user.displayName}`
            }
          >
            {activating ? <Power className="size-4" /> : <PowerOff className="size-4" />}
            {statusMutation.isPending
              ? "Updating..."
              : activating
                ? "Activate"
                : "Deactivate"}
          </Button>
        )}
      </div>

      <Dialog
        open={confirmationAction !== null}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogCopy.title}</DialogTitle>
            <DialogDescription>{dialogCopy.description}</DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 px-4 py-3">
            <p className="text-sm font-medium">{user.displayName}</p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>

          {activeMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {activeMutation.error instanceof Error
                ? activeMutation.error.message
                : "The action could not be completed"}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={activeMutation.isPending}
              onClick={() => setConfirmationAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                confirmationAction === "REVOKE" ||
                (confirmationAction === "STATUS" && !activating)
                  ? "destructive"
                  : "default"
              }
              disabled={activeMutation.isPending}
              onClick={() => void handleConfirm()}
            >
              {activeMutation.isPending ? "Working..." : dialogCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

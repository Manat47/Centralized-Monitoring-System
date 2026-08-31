"use client";

import { useState } from "react";
import {
  Ban,
  Ellipsis,
  LoaderCircle,
  Mail,
  Power,
  PowerOff,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <div className="flex justify-end gap-1">
        <EditUserDialog user={user} isCurrentUser={isCurrentUser} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title={`More actions for ${user.displayName}`}
              />
            }
          >
            <Ellipsis className="size-4" />
            <span className="sr-only">More actions</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-44 duration-150"
          >
            {isInvitation ? (
              <>
                <DropdownMenuItem
                  disabled={
                    resendMutation.isPending || revokeMutation.isPending
                  }
                  onClick={() => setConfirmationAction("RESEND")}
                >
                  <Mail className="size-4" />
                  Resend invitation
                </DropdownMenuItem>

                {user.invitationStatus !== "REVOKED" && (
                  <DropdownMenuItem
                    disabled={
                      resendMutation.isPending || revokeMutation.isPending
                    }
                    onClick={() => setConfirmationAction("REVOKE")}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="size-4" />
                    Revoke invitation
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem
                disabled={statusMutation.isPending || isCurrentUser}
                onClick={() => setConfirmationAction("STATUS")}
                className={
                  activating
                    ? undefined
                    : "text-destructive focus:text-destructive"
                }
              >
                {activating ? (
                  <Power className="size-4" />
                ) : (
                  <PowerOff className="size-4" />
                )}

                {activating ? "Activate user" : "Deactivate user"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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

          <div className="py-1">
            <p className="text-sm font-medium text-slate-900">
              {user.displayName}
            </p>
            <p className="mt-0.5 break-all text-sm text-slate-500">
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
              className={
                confirmationAction === "REVOKE" ||
                (confirmationAction === "STATUS" && !activating)
                  ? undefined
                  : `
          bg-blue-600 text-white
          transition-[background-color,transform] duration-150
          hover:bg-blue-700
          active:scale-[0.99] active:bg-blue-800
        `
              }
              disabled={activeMutation.isPending}
              aria-busy={activeMutation.isPending}
              onClick={() => void handleConfirm()}
            >
              {activeMutation.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}

              {activeMutation.isPending ? "Working..." : dialogCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

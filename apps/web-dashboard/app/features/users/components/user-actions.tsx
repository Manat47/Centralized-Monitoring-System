"use client";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/app/features/auth/components/auth-provider";

import { useUpdateUserStatus } from "../api/use-user-actions";
import type { User } from "../types/user";
import { EditUserDialog } from "./edit-user-dialog";

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const { user: currentUser } = useAuth();
  const statusMutation = useUpdateUserStatus();

  const isCurrentUser = currentUser?.userId === user.userId;

  async function handleStatusChange(): Promise<void> {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmed = window.confirm(
      `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} "${user.displayName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await statusMutation.mutateAsync({
        userId: user.userId,
        input: {
          status: nextStatus,
        },
      });
    } catch {
      // แสดง error ด้านล่าง
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <EditUserDialog user={user} />

        <Button
          type="button"
          size="sm"
          variant={user.status === "ACTIVE" ? "destructive" : "outline"}
          disabled={statusMutation.isPending || isCurrentUser}
          onClick={() => void handleStatusChange()}
        >
          {statusMutation.isPending &&
          statusMutation.variables?.userId === user.userId
            ? "Updating..."
            : user.status === "ACTIVE"
              ? "Deactivate"
              : "Activate"}
        </Button>
      </div>

      {isCurrentUser && (
        <p className="text-right text-xs text-muted-foreground">
          You cannot deactivate your own account.
        </p>
      )}

      {statusMutation.isError && (
        <p className="max-w-80 text-right text-xs text-destructive">
          {statusMutation.error instanceof Error
            ? statusMutation.error.message
            : "Failed to update user status"}
        </p>
      )}
    </div>
  );
}

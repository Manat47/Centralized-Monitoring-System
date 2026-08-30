"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUpdateUser } from "../api/use-user-actions";
import type { User, UserRole } from "../types/user";

interface EditUserDialogProps {
  user: User;
  isCurrentUser: boolean;
}

export function EditUserDialog({ user, isCurrentUser }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState<UserRole>(user.role);

  const updateMutation = useUpdateUser();

  function handleOpenChange(value: boolean): void {
    setOpen(value);

    if (!value) {
      setDisplayName(user.displayName);
      setRole(user.role);
      updateMutation.reset();
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      await updateMutation.mutateAsync({
        userId: user.userId,
        input: {
          displayName: displayName.trim(),
          role,
        },
      });

      handleOpenChange(false);
    } catch {
      // แสดง error ใน dialog
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title={`Edit ${user.displayName}`}
            className="
        transition-[color,background-color,transform] duration-150
        hover:bg-blue-50 hover:text-blue-700
        active:scale-95
      "
          />
        }
      >
        <Pencil className="size-4" />
        <span className="sr-only">Edit user</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update the display name or role for
              {` ${user.email}`}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor={`display-name-${user.userId}`}>
                Display name
              </Label>

              <Input
                id={`display-name-${user.userId}`}
                value={displayName}
                minLength={2}
                maxLength={100}
                required
                onChange={(event) => setDisplayName(event.target.value)}
                className="
  h-10
  focus-visible:border-blue-500
  focus-visible:ring-2
  focus-visible:ring-blue-500/20
"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>

              <Select
                value={role}
                disabled={isCurrentUser}
                onValueChange={(value) =>
                  setRole((value ?? user.role) as UserRole)
                }
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent
                  alignItemWithTrigger={false}
                  sideOffset={6}
                  className="duration-150"
                >
                  <SelectItem value="ADMIN">Admin</SelectItem>

                  <SelectItem value="OPERATOR">Operator</SelectItem>
                </SelectContent>
              </Select>
              {isCurrentUser && (
                <p className="text-xs text-muted-foreground">
                  Your own role cannot be changed. Ask another administrator to
                  update it.
                </p>
              )}
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-destructive">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "Failed to update user"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                updateMutation.isPending || displayName.trim().length < 2
              }
              aria-busy={updateMutation.isPending}
              className="
    min-w-[8.5rem]
    bg-blue-600 text-white
    transition-[background-color,transform] duration-150
    hover:bg-blue-700
    active:scale-[0.99] active:bg-blue-800
  "
            >
              {updateMutation.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}

              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

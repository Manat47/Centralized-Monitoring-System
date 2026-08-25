"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";

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
        render={<Button type="button" size="sm" variant="outline" />}
      >
        <Pencil className="size-4" />
        Edit
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
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
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

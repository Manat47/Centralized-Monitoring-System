"use client";

import { useState, type FormEvent } from "react";
import { MailPlus } from "lucide-react";

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

import { useCreateUser } from "../api/use-user-actions";
import type { CreateUserInput, UserRole } from "../types/user";

const initialForm: CreateUserInput = {
  email: "",
  displayName: "",
  role: "OPERATOR",
};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(initialForm);

  const createMutation = useCreateUser();

  function handleOpenChange(value: boolean): void {
    setOpen(value);

    if (!value) {
      setForm(initialForm);
      createMutation.reset();
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      await createMutation.mutateAsync({
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        role: form.role,
      });

      handleOpenChange(false);
    } catch {
      // แสดง error ใน dialog
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>
        <MailPlus className="size-4" />
        Invite user
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Send a one-time password setup link to a new administrator or operator.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="user-display-name">Display name</Label>

              <Input
                id="user-display-name"
                value={form.displayName}
                minLength={2}
                maxLength={100}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email</Label>

              <Input
                id="user-email"
                type="email"
                value={form.email}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>

              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    role: (value ?? "OPERATOR") as UserRole,
                  }))
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
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create user"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={createMutation.isPending} aria-busy={createMutation.isPending} className="min-w-[8.5rem]">
              {createMutation.isPending ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, type FormEvent } from "react";

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

import { useCreateAsset } from "../api/use-asset-actions";
import type {
  AssetEnvironment,
  AssetTargetType,
  CreateAssetInput,
} from "../types/asset";
import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { LoaderCircle, Plus } from "lucide-react";

const initialForm: CreateAssetInput = {
  name: "",
  hostname: "",
  targetType: "SERVER",
  ipAddress: "",
  endpoint: "",
  environment: "DEVELOPMENT",
};

export function CreateAssetDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAssetInput>(initialForm);

  const createMutation = useCreateAsset();

  function updateField<K extends keyof CreateAssetInput>(
    field: K,
    value: CreateAssetInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleTargetTypeChange(value: AssetTargetType) {
    setForm((current) => ({
      ...current,
      targetType: value,

      // SERVER ไม่ใช้ endpoint
      endpoint: value === "SERVER" ? "" : current.endpoint,

      // APPLICATION ไม่ใช้ ipAddress
      ipAddress: value === "SERVER" ? current.ipAddress : "",
    }));
  }

  function resetForm() {
    setForm(initialForm);
    createMutation.reset();
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (!value) {
      resetForm();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: CreateAssetInput = {
      name: form.name.trim(),
      targetType: form.targetType,
      environment: form.environment,
    };

    const hostname = form.hostname?.trim();

    if (hostname) {
      input.hostname = hostname;
    }

    if (form.targetType === "SERVER") {
      const ipAddress = form.ipAddress?.trim();

      if (ipAddress) {
        input.ipAddress = ipAddress;
      }
    } else {
      const endpoint = form.endpoint?.trim();

      if (endpoint) {
        input.endpoint = endpoint;
      }
    }

    try {
      await createMutation.mutateAsync(input);
      setOpen(false);
      resetForm();
    } catch {
      // error แสดงใน Dialog ด้านล่าง
    }
  }

  const isServer = form.targetType === "SERVER";

  return (
    <AdminOnly>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              className="
    gap-2 bg-blue-600 text-white
    shadow-sm shadow-blue-950/5
    transition-[background-color,box-shadow,transform] duration-150
    hover:bg-blue-700 hover:shadow
    active:scale-[0.99] active:bg-blue-800
  "
            />
          }
        >
          <Plus className="size-4" />
          Add Asset
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg duration-150">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Register Asset</DialogTitle>

              <DialogDescription>
                Add a server or application to the monitoring inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  value={form.name}
                  maxLength={255}
                  required
                  onChange={(event) => updateField("name", event.target.value)}
                  className="
    focus-visible:border-blue-500
    focus-visible:ring-2
    focus-visible:ring-blue-500/20
  "
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="asset-hostname">Hostname (optional)</Label>
                <Input
                  id="asset-hostname"
                  value={form.hostname ?? ""}
                  maxLength={255}
                  onChange={(event) =>
                    updateField("hostname", event.target.value)
                  }
                  className="
    focus-visible:border-blue-500
    focus-visible:ring-2
    focus-visible:ring-blue-500/20
  "
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Type</Label>

                  <Select
                    value={form.targetType}
                    onValueChange={(value) =>
                      handleTargetTypeChange(value as AssetTargetType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="SERVER">Server</SelectItem>
                      <SelectItem value="APPLICATION">Application</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Environment</Label>

                  <Select
                    value={form.environment}
                    onValueChange={(value) =>
                      updateField("environment", value as AssetEnvironment)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="PRODUCTION">Production</SelectItem>
                      <SelectItem value="STAGING">Staging</SelectItem>
                      <SelectItem value="DEVELOPMENT">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isServer ? (
                <div
                  key="server-address"
                  className="grid gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
                >
                  <Label htmlFor="asset-ip">IP Address</Label>

                  <Input
                    id="asset-ip"
                    value={form.ipAddress ?? ""}
                    placeholder="192.168.1.10"
                    required
                    onChange={(event) =>
                      updateField("ipAddress", event.target.value)
                    }
                    className="
    focus-visible:border-blue-500
    focus-visible:ring-2
    focus-visible:ring-blue-500/20
  "
                  />
                </div>
              ) : (
                <div
                  key="application-endpoint"
                  className="grid gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
                >
                  <Label htmlFor="asset-endpoint">Endpoint URL</Label>

                  <Input
                    id="asset-endpoint"
                    value={form.endpoint ?? ""}
                    placeholder="https://service.example.com"
                    maxLength={2048}
                    required
                    onChange={(event) =>
                      updateField("endpoint", event.target.value)
                    }
                    className="
    focus-visible:border-blue-500
    focus-visible:ring-2
    focus-visible:ring-blue-500/20
  "
                  />
                </div>
              )}

              {createMutation.isError && (
                <p
                  role="alert"
                  className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Failed to create asset"}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={createMutation.isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="
    bg-blue-600 text-white
    shadow-sm shadow-blue-950/5
    transition-[background-color,box-shadow,transform] duration-150
    hover:bg-blue-700 hover:shadow
    active:scale-[0.99] active:bg-blue-800
  "
              >
                {createMutation.isPending && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}

                {createMutation.isPending ? "Registering..." : "Register asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminOnly>
  );
}

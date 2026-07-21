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

      // APPLICATION และ SERVICE ไม่ใช้ ipAddress
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>
        Create asset
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create asset</DialogTitle>
            <DialogDescription>
              Register a new infrastructure asset.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={form.name}
                maxLength={255}
                required
                onChange={(event) => updateField("name", event.target.value)}
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
              />
            </div>

            <div className="grid gap-2">
              <Label>Target type</Label>

              <Select
                value={form.targetType}
                onValueChange={(value) =>
                  handleTargetTypeChange(value as AssetTargetType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="SERVER">Server</SelectItem>
                  <SelectItem value="APPLICATION">Application</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isServer ? (
              <div className="grid gap-2">
                <Label htmlFor="asset-ip">IP address</Label>
                <Input
                  id="asset-ip"
                  value={form.ipAddress ?? ""}
                  placeholder="192.168.1.10"
                  required
                  onChange={(event) =>
                    updateField("ipAddress", event.target.value)
                  }
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="asset-endpoint">Endpoint</Label>
                <Input
                  id="asset-endpoint"
                  value={form.endpoint ?? ""}
                  placeholder="https://service.example.com"
                  maxLength={2048}
                  required
                  onChange={(event) =>
                    updateField("endpoint", event.target.value)
                  }
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Environment</Label>

              <Select
                value={form.environment}
                onValueChange={(value) =>
                  updateField("environment", value as AssetEnvironment)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="STAGING">Staging</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
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

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

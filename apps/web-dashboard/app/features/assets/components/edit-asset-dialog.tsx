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

import { useUpdateAsset } from "../api/use-asset-actions";
import type {
  Asset,
  AssetEnvironment,
  AssetTargetType,
  UpdateAssetInput,
} from "../types/asset";

interface EditAssetDialogProps {
  asset: Asset;
}

function createFormFromAsset(asset: Asset): UpdateAssetInput {
  return {
    name: asset.name,
    hostname: asset.hostname ?? "",
    targetType: asset.targetType,
    ipAddress: asset.ipAddress ?? "",
    endpoint: asset.endpoint ?? "",
    environment: asset.environment,
  };
}

export function EditAssetDialog({ asset }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UpdateAssetInput>(() =>
    createFormFromAsset(asset),
  );

  const updateMutation = useUpdateAsset();

  function updateField<K extends keyof UpdateAssetInput>(
    field: K,
    value: UpdateAssetInput[K],
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
      ipAddress: value === "SERVER" ? current.ipAddress : "",
      endpoint: value === "SERVER" ? "" : current.endpoint,
    }));
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      setForm(createFormFromAsset(asset));
      updateMutation.reset();
    }

    setOpen(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetType = form.targetType ?? asset.targetType;

    const input: UpdateAssetInput = {
      name: form.name?.trim(),
      hostname: form.hostname?.trim() || undefined,
      targetType,
      environment: form.environment,
    };

    if (targetType === "SERVER") {
      input.ipAddress = form.ipAddress?.trim();
      input.endpoint = undefined;
    } else {
      input.endpoint = form.endpoint?.trim();
      input.ipAddress = undefined;
    }

    try {
      await updateMutation.mutateAsync({
        assetId: asset.assetId,
        input,
      });

      handleOpenChange(false);
    } catch {}
  }

  const targetType = form.targetType ?? asset.targetType;
  const isServer = targetType === "SERVER";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        Edit
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit asset</DialogTitle>
            <DialogDescription>
              Update the configuration for {asset.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor={`name-${asset.assetId}`}>Name</Label>
              <Input
                id={`name-${asset.assetId}`}
                value={form.name ?? ""}
                maxLength={255}
                required
                onChange={(event) => updateField("name", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`hostname-${asset.assetId}`}>Hostname</Label>
              <Input
                id={`hostname-${asset.assetId}`}
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
                value={targetType}
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
                <Label htmlFor={`ip-${asset.assetId}`}>IP address</Label>
                <Input
                  id={`ip-${asset.assetId}`}
                  value={form.ipAddress ?? ""}
                  required
                  onChange={(event) =>
                    updateField("ipAddress", event.target.value)
                  }
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor={`endpoint-${asset.assetId}`}>Endpoint</Label>
                <Input
                  id={`endpoint-${asset.assetId}`}
                  value={form.endpoint ?? ""}
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
                value={form.environment ?? asset.environment}
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

            {updateMutation.isError && (
              <p className="text-sm text-destructive">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "Failed to update asset"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

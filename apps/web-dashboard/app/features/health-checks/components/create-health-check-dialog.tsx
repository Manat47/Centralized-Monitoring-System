"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, LoaderCircle, Plus } from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
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

import { useCreateHealthCheckTarget } from "../api/use-health-check-actions";
import { hasOriginMismatch } from "./health-check-status";

export function CreateHealthCheckDialog() {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState(15);
  const assetsQuery = useAssets();
  const createMutation = useCreateHealthCheckTarget();
  const applications = (assetsQuery.data ?? []).filter(
    (asset) =>
      asset.targetType === "APPLICATION" && asset.status !== "DEACTIVATE",
  );
  const selectedAsset = applications.find((asset) => asset.assetId === assetId);
  const originMismatch = hasOriginMismatch(
    selectedAsset?.endpoint ?? null,
    url,
  );

  function reset() {
    setAssetId("");
    setUrl("");
    setInterval(15);
    createMutation.reset();
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) reset();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      await createMutation.mutateAsync({
        assetId,
        url: url.trim(),
        checkIntervalSeconds: interval,
      });
      handleOpenChange(false);
    } catch {
      // Mutation error is rendered below.
    }
  }

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
          Create Health Check
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Health Check</DialogTitle>
            <DialogDescription>
              Monitor an HTTP endpoint for an application asset.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid gap-2">
              <Label>Application</Label>
              <Select
                value={assetId}
                onValueChange={(value) => {
                  const nextId = value ?? "";
                  const asset = applications.find(
                    (item) => item.assetId === nextId,
                  );
                  setAssetId(nextId);
                  setUrl(asset?.endpoint ?? "");
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select an application">
                    {selectedAsset?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  sideOffset={6}
                  className="duration-150"
                >
                  {applications.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="health-url">Health endpoint URL</Label>
              <Input
                id="health-url"
                type="url"
                placeholder="https://app.example.com/health"
                value={url}
                required
                onChange={(event) => setUrl(event.target.value)}
              />
              {originMismatch && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  This URL uses a different origin from the application
                  endpoint.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="health-interval">Check interval (seconds)</Label>
              <Input
                id="health-interval"
                type="number"
                min={5}
                value={interval}
                required
                onChange={(event) => setInterval(Number(event.target.value))}
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-rose-600">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create health check"}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!assetId || createMutation.isPending}
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
                {createMutation.isPending ? "Creating..." : "Create check"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminOnly>
  );
}

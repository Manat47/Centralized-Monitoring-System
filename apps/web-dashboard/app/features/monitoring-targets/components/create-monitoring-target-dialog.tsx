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

import { useAssets } from "@/app/features/assets/api/use-assets";

import { useCreateMonitoringTarget } from "../api/use-monitoring-target-actions";
import type { CreateMonitoringTargetInput } from "../types/monitoring-target";

const initialForm: CreateMonitoringTargetInput = {
  assetId: "",
  port: 9100,
  path: "/metrics",
  scrapeIntervalSeconds: 15,
};

export function CreateMonitoringTargetDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateMonitoringTargetInput>(initialForm);

  const assetsQuery = useAssets();
  const createMutation = useCreateMonitoringTarget();

  const availableAssets = (assetsQuery.data ?? []).filter(
    (asset) => asset.targetType === "SERVER" && asset.status === "ACTIVATE",
  );

  function handleOpenChange(value: boolean) {
    setOpen(value);

    if (!value) {
      setForm(initialForm);
      createMutation.reset();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createMutation.mutateAsync({
        assetId: form.assetId,
        port: Number(form.port),
        path: form.path?.trim() || "/metrics",
        scrapeIntervalSeconds: Number(form.scrapeIntervalSeconds),
      });

      handleOpenChange(false);
    } catch {
      // แสดง error ด้านล่าง
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>
        Create target
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create monitoring target</DialogTitle>
            <DialogDescription>
              Configure Node Exporter metric collection for a server.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label>Asset</Label>

              <Select
                value={form.assetId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    assetId: value ?? "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a server asset" />
                </SelectTrigger>

                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      {asset.name} —{" "}
                      {asset.hostname ?? asset.ipAddress ?? "No host"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableAssets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active server assets are available.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="monitoring-port">Port</Label>
              <Input
                id="monitoring-port"
                type="number"
                min={1}
                max={65535}
                value={form.port ?? 9100}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    port: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="monitoring-path">Path</Label>
              <Input
                id="monitoring-path"
                value={form.path ?? "/metrics"}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    path: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scrape-interval">Scrape interval (seconds)</Label>
              <Input
                id="scrape-interval"
                type="number"
                min={5}
                value={form.scrapeIntervalSeconds ?? 15}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scrapeIntervalSeconds: Number(event.target.value),
                  }))
                }
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create monitoring target"}
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

            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !form.assetId ||
                availableAssets.length === 0
              }
            >
              {createMutation.isPending ? "Creating..." : "Create target"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

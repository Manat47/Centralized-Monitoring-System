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
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";

import { useCreateMetricRule } from "../api/use-metric-rule-actions";
import type {
  CreateMetricRuleInput,
  MetricRuleOperator,
  MetricRuleSeverity,
  MetricRuleType,
} from "../types/metric-rule";

const initialForm: CreateMetricRuleInput = {
  assetId: "",
  metricType: "CPU_USAGE",
  operator: "GREATER_THAN_OR_EQUAL",
  thresholdValue: 80,
  durationSeconds: 300,
  severity: "WARNING",
};

export function CreateMetricRuleDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateMetricRuleInput>(initialForm);

  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();
  const createMutation = useCreateMetricRule();

  const enabledAssetIds = new Set(
    (targetsQuery.data ?? [])
      .filter(
        (target) =>
          target.verificationStatus === "VERIFIED" && target.monitoringEnabled,
      )
      .map((target) => target.assetId),
  );

  const availableAssets = (assetsQuery.data ?? []).filter(
    (asset) =>
      asset.targetType === "SERVER" &&
      asset.status === "ACTIVATE" &&
      enabledAssetIds.has(asset.assetId),
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
        metricType: form.metricType,
        operator: form.operator,
        thresholdValue: Number(form.thresholdValue),
        durationSeconds: Number(form.durationSeconds),
        severity: form.severity,
      });

      handleOpenChange(false);
    } catch {
      // แสดง error ใน dialog
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>
        Create rule
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create metric rule</DialogTitle>
            <DialogDescription>
              Create a threshold rule for a monitored server.
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
                  <SelectValue placeholder="Select monitored server" />
                </SelectTrigger>

                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {availableAssets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active and enabled server targets are available.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Metric type</Label>

              <Select
                value={form.metricType}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    metricType: (value ?? "CPU_USAGE") as MetricRuleType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="CPU_USAGE">CPU Usage</SelectItem>
                  <SelectItem value="MEMORY_USAGE">Memory Usage</SelectItem>
                  <SelectItem value="DISK_USAGE">Disk Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Operator</Label>

              <Select
                value={form.operator ?? "GREATER_THAN_OR_EQUAL"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    operator: (value ??
                      "GREATER_THAN_OR_EQUAL") as MetricRuleOperator,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="GREATER_THAN">
                    Greater than (&gt;)
                  </SelectItem>
                  <SelectItem value="GREATER_THAN_OR_EQUAL">
                    Greater than or equal (≥)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-threshold">Threshold (%)</Label>

              <Input
                id="rule-threshold"
                type="number"
                min={0}
                max={100}
                value={form.thresholdValue}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    thresholdValue: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rule-duration">Duration (seconds)</Label>

              <Input
                id="rule-duration"
                type="number"
                min={0}
                value={form.durationSeconds ?? 300}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationSeconds: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Severity</Label>

              <Select
                value={form.severity}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    severity: (value ?? "WARNING") as MetricRuleSeverity,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create metric rule"}
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
              {createMutation.isPending ? "Creating..." : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

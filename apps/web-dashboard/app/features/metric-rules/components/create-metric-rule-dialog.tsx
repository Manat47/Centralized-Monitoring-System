"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMetricRule } from "../api/use-metric-rule-actions";
import { useMetricRules } from "../api/use-metric-rules";
import type { MetricRuleOperator, MetricRuleType } from "../types/metric-rule";

const metrics: { value: MetricRuleType; label: string }[] = [
  { value: "CPU_USAGE", label: "CPU Usage" },
  { value: "MEMORY_USAGE", label: "Memory Usage" },
  { value: "DISK_USAGE", label: "Disk Usage" },
];
const operators: MetricRuleOperator[] = [">=", ">", "<=", "<"];

const initialForm = {
  assetId: "",
  metricType: "CPU_USAGE" as MetricRuleType,
  operator: ">=" as MetricRuleOperator,
  warningThreshold: "35",
  warningDurationSeconds: "30",
  criticalThreshold: "80",
  criticalDurationSeconds: "60",
};

export function CreateMetricRuleDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();
  const rulesQuery = useMetricRules();
  const createMutation = useCreateMetricRule();

  const enabledAssetIds = new Set((targetsQuery.data ?? [])
    .filter((target) => target.verificationStatus === "VERIFIED" && target.monitoringEnabled)
    .map((target) => target.assetId));
  const availableAssets = (assetsQuery.data ?? []).filter((asset) =>
    asset.targetType === "SERVER" && asset.status === "ACTIVATE" && enabledAssetIds.has(asset.assetId));
  const configured = new Set((rulesQuery.data ?? [])
    .filter((rule) => rule.assetId === form.assetId && !rule.archivedAt)
    .map((rule) => rule.metricType));
  const warning = Number(form.warningThreshold);
  const critical = Number(form.criticalThreshold);
  const invalidHierarchy = form.warningThreshold !== "" && form.criticalThreshold !== "" &&
    ((form.operator === ">" || form.operator === ">=") ? warning >= critical : warning <= critical);
  const invalidDurations = Number(form.warningDurationSeconds) < 10 || Number(form.criticalDurationSeconds) < 10;

  function close(value: boolean) {
    setOpen(value);
    if (!value) {
      setForm(initialForm);
      createMutation.reset();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidHierarchy || invalidDurations || configured.has(form.metricType)) return;
    try {
      await createMutation.mutateAsync({
        assetId: form.assetId,
        metricType: form.metricType,
        operator: form.operator,
        warningThreshold: warning,
        warningDurationSeconds: Number(form.warningDurationSeconds),
        criticalThreshold: critical,
        criticalDurationSeconds: Number(form.criticalDurationSeconds),
      });
      close(false);
    } catch {
      // The mutation error is shown below the form.
    }
  }

  return <AdminOnly>
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger render={<Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" />}>
        Create rule
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Create metric rule</DialogTitle>
            <DialogDescription>Set Warning and Critical thresholds for one server metric.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Asset</Label>
              <Select value={form.assetId} onValueChange={(value) => setForm((current) => ({ ...current, assetId: value ?? "" }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select monitored server" /></SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => <SelectItem key={asset.assetId} value={asset.assetId}>{asset.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {availableAssets.length === 0 && <p className="text-xs text-muted-foreground">No verified server target is available.</p>}
            </div>
            <div className="grid gap-2">
              <Label>Metric</Label>
              <Select value={form.metricType} onValueChange={(value) => setForm((current) => ({ ...current, metricType: (value ?? "CPU_USAGE") as MetricRuleType }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metrics.map((metric) => <SelectItem key={metric.value} value={metric.value} disabled={configured.has(metric.value)}>
                    {metric.label}{configured.has(metric.value) ? " (rule exists — edit it instead)" : ""}
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Comparison</Label>
            <Select value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: (value ?? ">=") as MetricRuleOperator }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{operators.map((operator) => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["warning", "critical"] as const).map((tier) => {
              const thresholdKey = tier === "warning" ? "warningThreshold" : "criticalThreshold";
              const durationKey = tier === "warning" ? "warningDurationSeconds" : "criticalDurationSeconds";
              return <div key={tier} className={tier === "warning" ? "space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4" : "space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4"}>
                <h3 className="font-medium capitalize">{tier} tier</h3>
                <div className="grid gap-2">
                  <Label htmlFor={`${tier}-threshold`}>Threshold (%)</Label>
                  <Input id={`${tier}-threshold`} type="number" min={0} max={100} step="any" required value={form[thresholdKey]}
                    onChange={(event) => setForm((current) => ({ ...current, [thresholdKey]: event.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${tier}-duration`}>Duration (seconds)</Label>
                  <Input id={`${tier}-duration`} type="number" min={10} step={1} required value={form[durationKey]}
                    onChange={(event) => setForm((current) => ({ ...current, [durationKey]: event.target.value }))} />
                </div>
              </div>;
            })}
          </div>
          {invalidHierarchy && <p className="text-sm text-rose-600">Warning must be {form.operator === ">" || form.operator === ">=" ? "below" : "above"} Critical.</p>}
          {createMutation.isError && <p className="text-sm text-rose-600">{createMutation.error instanceof Error ? createMutation.error.message : "Failed to create metric rule"}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !form.assetId || invalidHierarchy || invalidDurations || configured.has(form.metricType) || rulesQuery.isLoading} className="bg-blue-600 text-white hover:bg-blue-700">
              {createMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
              {createMutation.isPending ? "Creating..." : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminOnly>;
}

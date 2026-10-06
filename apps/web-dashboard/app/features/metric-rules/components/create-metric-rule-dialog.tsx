"use client";

import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMetricRule } from "../api/use-metric-rule-actions";
import { useMetricRules } from "../api/use-metric-rules";
import type { MetricRuleOperator, MetricRuleType } from "../types/metric-rule";

const metrics: { value: MetricRuleType; label: string; unit: string }[] = [
  { value: "CPU_USAGE", label: "CPU Usage", unit: "%" },
  { value: "MEMORY_USAGE", label: "Memory Usage", unit: "%" },
  { value: "DISK_USAGE", label: "Disk Usage", unit: "%" },
];
const operators: MetricRuleOperator[] = [">=", ">", "<=", "<"];
type DurationUnit = "sec" | "min" | "hr";

const initialForm: {
  assetId: string;
  metricType: MetricRuleType;
  operator: MetricRuleOperator;
  warningEnabled: boolean;
  warningThreshold: string;
  warningDuration: string;
  warningDurationUnit: DurationUnit;
  criticalThreshold: string;
  criticalDuration: string;
  criticalDurationUnit: DurationUnit;
} = {
  assetId: "",
  metricType: "CPU_USAGE",
  operator: ">=",
  warningEnabled: false,
  warningThreshold: "35",
  warningDuration: "30",
  warningDurationUnit: "sec",
  criticalThreshold: "80",
  criticalDuration: "1",
  criticalDurationUnit: "min",
};

function durationSeconds(value: string, unit: DurationUnit) {
  return Number(value) * (unit === "hr" ? 3600 : unit === "min" ? 60 : 1);
}

function thresholdError(value: string): string | null {
  if (value === "") return "Enter a threshold.";
  if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) {
    return "Enter a value between 0 and 100.";
  }
  return null;
}

function durationError(value: string, unit: DurationUnit): string | null {
  if (value === "") return "Enter a duration.";
  const seconds = durationSeconds(value, unit);
  if (!Number.isInteger(seconds) || seconds < 10) {
    return "Use at least 10 seconds, in whole seconds.";
  }
  return null;
}

function freshWarningFields(criticalValue: string, operator: MetricRuleOperator) {
  const critical = Number(criticalValue);
  const increasing = operator === ">" || operator === ">=";
  const warningThreshold = criticalValue !== "" && Number.isFinite(critical) && critical >= 0 && critical <= 100
    ? String(increasing ? Math.max(0, critical - 10) : Math.min(100, critical + 10))
    : "";
  return {
    warningThreshold,
    warningDuration: "30",
    warningDurationUnit: "sec" as DurationUnit,
  };
}

function ThresholdTierCard({
  tier,
  unit,
  threshold,
  duration,
  durationUnit,
  thresholdMessage,
  durationMessage,
  disabled = false,
  onThresholdChange,
  onDurationChange,
  onDurationUnitChange,
  onRemove,
}: {
  tier: "critical" | "warning";
  unit: string;
  threshold: string;
  duration: string;
  durationUnit: DurationUnit;
  thresholdMessage: string | null;
  durationMessage: string | null;
  disabled?: boolean;
  onThresholdChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onDurationUnitChange: (unit: DurationUnit) => void;
  onRemove?: () => void;
}) {
  const isCritical = tier === "critical";
  const label = isCritical ? "Critical" : "Warning";
  return <section className={`space-y-4 rounded-xl border p-4 ${isCritical ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{label} threshold</h3>
        <Badge className={isCritical ? "border border-rose-200 bg-rose-100 text-rose-700" : "border border-amber-200 bg-amber-100 text-amber-700"}>{label}</Badge>
      </div>
      {onRemove && <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove Warning tier" onClick={onRemove} className="text-amber-800 hover:bg-amber-100 hover:text-amber-950">
        <Trash2 className="size-4" />
      </Button>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-2">
        <Label htmlFor={`${tier}-threshold`}>Threshold</Label>
        <div className="relative">
          <Input id={`${tier}-threshold`} type="number" min={0} max={100} step="any" required disabled={disabled}
            className="pr-12" value={threshold} aria-invalid={Boolean(thresholdMessage)}
            aria-describedby={thresholdMessage ? `${tier}-threshold-error` : undefined}
            onChange={(event) => onThresholdChange(event.target.value)} />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">{unit}</span>
        </div>
        {thresholdMessage && <p id={`${tier}-threshold-error`} className="text-xs text-rose-700" role="alert">{thresholdMessage}</p>}
      </div>
      <div className="grid content-start gap-2">
        <Label htmlFor={`${tier}-duration`}>Duration</Label>
        <div className="relative">
          <Input id={`${tier}-duration`} type="number" min={0} step="any" required disabled={disabled}
            className="pr-20" value={duration} aria-invalid={Boolean(durationMessage)}
            aria-describedby={durationMessage ? `${tier}-duration-error` : undefined}
            onChange={(event) => onDurationChange(event.target.value)} />
          <select aria-label={`${label} duration unit`} value={durationUnit} disabled={disabled}
            onChange={(event) => onDurationUnitChange(event.target.value as DurationUnit)}
            className="absolute inset-y-1 right-1 rounded-md bg-transparent px-2 text-xs text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50">
            <option value="sec">sec</option><option value="min">min</option><option value="hr">hr</option>
          </select>
        </div>
        {durationMessage && <p id={`${tier}-duration-error`} className="text-xs text-rose-700" role="alert">{durationMessage}</p>}
      </div>
    </div>
  </section>;
}

export function CreateMetricRuleDialog() {
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [form, setForm] = useState(initialForm);
  const assetTriggerRef = useRef<HTMLButtonElement>(null);
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
  const thresholdUnit = metrics.find((metric) => metric.value === form.metricType)?.unit ?? "%";
  const criticalThresholdError = thresholdError(form.criticalThreshold);
  const warningThresholdError = form.warningEnabled ? thresholdError(form.warningThreshold) : null;
  const criticalDurationError = durationError(form.criticalDuration, form.criticalDurationUnit);
  const warningDurationError = form.warningEnabled ? durationError(form.warningDuration, form.warningDurationUnit) : null;
  const invalidHierarchy = form.warningEnabled && !criticalThresholdError && !warningThresholdError &&
    ((form.operator === ">" || form.operator === ">=") ? warning >= critical : warning <= critical);
  const criticalMessage = invalidHierarchy
    ? `Critical must be ${form.operator === ">" || form.operator === ">=" ? "greater than" : "less than"} Warning.`
    : criticalThresholdError;
  const validForm = Boolean(form.assetId) && !criticalMessage && !warningThresholdError &&
    !criticalDurationError && !warningDurationError && !configured.has(form.metricType);
  const isDirty = form.assetId !== initialForm.assetId || form.metricType !== initialForm.metricType ||
    form.operator !== initialForm.operator || form.criticalThreshold !== initialForm.criticalThreshold ||
    form.criticalDuration !== initialForm.criticalDuration || form.criticalDurationUnit !== initialForm.criticalDurationUnit ||
    form.warningEnabled;

  function finishClose() {
    setConfirmDiscard(false);
    setOpen(false);
    setForm(initialForm);
    createMutation.reset();
  }

  function requestClose() {
    if (createMutation.isPending) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    finishClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validForm) return;
    try {
      await createMutation.mutateAsync({
        assetId: form.assetId,
        metricType: form.metricType,
        operator: form.operator,
        warningEnabled: form.warningEnabled,
        ...(form.warningEnabled ? {
          warningThreshold: warning,
          warningDurationSeconds: durationSeconds(form.warningDuration, form.warningDurationUnit),
        } : {}),
        criticalThreshold: critical,
        criticalDurationSeconds: durationSeconds(form.criticalDuration, form.criticalDurationUnit),
      });
      finishClose();
    } catch {
      // The mutation error is shown below the form.
    }
  }

  return <AdminOnly>
    <Dialog open={open} onOpenChange={(next) => { if (next) setOpen(true); else requestClose(); }}>
      <DialogTrigger render={<Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" />}>
        Create rule
      </DialogTrigger>
      <DialogContent showCloseButton={false} initialFocus={assetTriggerRef} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogClose render={<Button type="button" size="icon-sm" variant="ghost" className="absolute right-3 top-3" />}>
          <X className="size-4" /><span className="sr-only">Close dialog</span>
        </DialogClose>
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader className="pr-10">
            <DialogTitle>Create metric rule</DialogTitle>
            <DialogDescription>Choose a server metric and set its Critical threshold. Add Warning when needed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="grid gap-2">
              <Label htmlFor="rule-asset">Asset (server)</Label>
              <Select value={form.assetId} onValueChange={(value) => setForm((current) => ({ ...current, assetId: value ?? "" }))}>
                <SelectTrigger ref={assetTriggerRef} id="rule-asset" className="w-full"><SelectValue placeholder="Select monitored server" /></SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => <SelectItem key={asset.assetId} value={asset.assetId}>{asset.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {availableAssets.length === 0 && <p className="text-xs text-muted-foreground">No verified server target is available.</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rule-metric">Metric</Label>
              <Select value={form.metricType} onValueChange={(value) => setForm((current) => ({ ...current, metricType: (value ?? "CPU_USAGE") as MetricRuleType }))}>
                <SelectTrigger id="rule-metric" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metrics.map((metric) => <SelectItem key={metric.value} value={metric.value} disabled={configured.has(metric.value)}>
                    {metric.label}{configured.has(metric.value) ? " (rule exists — edit it instead)" : ""}
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid max-w-36 gap-2">
            <Label htmlFor="rule-comparison">Comparison</Label>
            <Select value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: (value ?? ">=") as MetricRuleOperator }))}>
              <SelectTrigger id="rule-comparison" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{operators.map((operator) => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ThresholdTierCard tier="critical" unit={thresholdUnit} threshold={form.criticalThreshold}
            duration={form.criticalDuration} durationUnit={form.criticalDurationUnit}
            thresholdMessage={criticalMessage} durationMessage={criticalDurationError}
            onThresholdChange={(value) => setForm((current) => ({ ...current, criticalThreshold: value }))}
            onDurationChange={(value) => setForm((current) => ({ ...current, criticalDuration: value }))}
            onDurationUnitChange={(unit) => setForm((current) => ({ ...current, criticalDurationUnit: unit }))} />
          {!form.warningEnabled && <Button type="button" variant="outline" size="sm"
            onClick={() => setForm((current) => ({ ...current, ...freshWarningFields(current.criticalThreshold, current.operator), warningEnabled: true }))}>+ Add Warning Tier</Button>}
          <div aria-hidden={!form.warningEnabled} inert={!form.warningEnabled}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${form.warningEnabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="min-h-0 overflow-hidden">
              <ThresholdTierCard tier="warning" unit={thresholdUnit} threshold={form.warningThreshold}
                duration={form.warningDuration} durationUnit={form.warningDurationUnit}
                thresholdMessage={warningThresholdError} durationMessage={warningDurationError}
                disabled={!form.warningEnabled}
                onThresholdChange={(value) => setForm((current) => ({ ...current, warningThreshold: value }))}
                onDurationChange={(value) => setForm((current) => ({ ...current, warningDuration: value }))}
                onDurationUnitChange={(unit) => setForm((current) => ({ ...current, warningDurationUnit: unit }))}
                onRemove={() => setForm((current) => ({ ...current, ...freshWarningFields(current.criticalThreshold, current.operator), warningEnabled: false }))} />
            </div>
          </div>
          {createMutation.isError && <p className="text-sm text-rose-600">{createMutation.error instanceof Error ? createMutation.error.message : "Failed to create metric rule"}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !validForm || rulesQuery.isLoading} className="bg-blue-600 text-white hover:bg-blue-700">
              {createMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
              {createMutation.isPending ? "Creating..." : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this rule?</AlertDialogTitle>
            <AlertDialogDescription>Your changes have not been saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" onClick={finishClose}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  </AdminOnly>;
}

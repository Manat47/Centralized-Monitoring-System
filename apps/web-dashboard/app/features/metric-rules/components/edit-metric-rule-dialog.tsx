"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateMetricRule } from "../api/use-metric-rule-actions";
import { useMetricRules } from "../api/use-metric-rules";
import type { MetricRule, MetricRuleOperator, MetricRuleType } from "../types/metric-rule";

const metrics: { value: MetricRuleType; label: string }[] = [
  { value: "CPU_USAGE", label: "CPU Usage" },
  { value: "MEMORY_USAGE", label: "Memory Usage" },
  { value: "DISK_USAGE", label: "Disk Usage" },
];
const operators: MetricRuleOperator[] = [">=", ">", "<=", "<"];

export function EditMetricRuleDialog({ rule, onClose }: { rule: MetricRule | null; onClose: () => void }) {
  const [form, setForm] = useState(() => ({
    metricType: rule?.metricType ?? "CPU_USAGE",
    operator: rule?.operator ?? ">=",
    warningEnabled: rule?.warningEnabled ?? true,
    warningThreshold: String(rule?.warningThreshold ?? 35),
    warningDurationSeconds: String(rule?.warningDurationSeconds ?? 30),
    criticalThreshold: String(rule?.criticalThreshold ?? 80),
    criticalDurationSeconds: String(rule?.criticalDurationSeconds ?? 60),
  }));
  const mutation = useUpdateMetricRule();
  const rulesQuery = useMetricRules();
  const configured = new Set((rulesQuery.data ?? [])
    .filter((existing) => existing.assetId === rule?.assetId && existing.ruleId !== rule?.ruleId && !existing.archivedAt)
    .map((existing) => existing.metricType));
  const warning = Number(form.warningThreshold);
  const critical = Number(form.criticalThreshold);
  const invalidHierarchy = form.warningEnabled && form.warningThreshold !== "" && form.criticalThreshold !== "" &&
    ((form.operator === ">" || form.operator === ">=") ? warning >= critical : warning <= critical);
  const validThresholds = [form.criticalThreshold, ...(form.warningEnabled ? [form.warningThreshold] : [])].every(
    (value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100,
  );
  const validDurations = [form.criticalDurationSeconds, ...(form.warningEnabled ? [form.warningDurationSeconds] : [])].every(
    (value) => value !== "" && Number.isInteger(Number(value)) && Number(value) >= 10,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rule || !validThresholds || !validDurations || invalidHierarchy || configured.has(form.metricType)) return;
    try {
      await mutation.mutateAsync({
        ruleId: rule.ruleId,
        input: {
          metricType: form.metricType,
          operator: form.operator,
          warningEnabled: form.warningEnabled,
          ...(form.warningEnabled ? {
            warningThreshold: warning,
            warningDurationSeconds: Number(form.warningDurationSeconds),
          } : {}),
          criticalThreshold: critical,
          criticalDurationSeconds: Number(form.criticalDurationSeconds),
        },
      });
      onClose();
    } catch {
      // The mutation error is shown below the form.
    }
  }

  return <Dialog open={Boolean(rule)} onOpenChange={(open) => { if (!open) { mutation.reset(); onClose(); } }}>
    <DialogContent className="sm:max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <DialogHeader>
          <DialogTitle>Edit metric rule</DialogTitle>
          <DialogDescription>Changing thresholds resolves the active alert and restarts evaluation.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Metric</Label>
            <Select value={form.metricType} onValueChange={(value) => setForm((current) => ({ ...current, metricType: (value ?? "CPU_USAGE") as MetricRuleType }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{metrics.map((metric) => <SelectItem key={metric.value} value={metric.value} disabled={configured.has(metric.value)}>
                {metric.label}{configured.has(metric.value) ? " (rule exists)" : ""}
              </SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Comparison</Label>
            <Select value={form.operator} onValueChange={(value) => setForm((current) => ({ ...current, operator: (value ?? ">=") as MetricRuleOperator }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{operators.map((operator) => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, warningEnabled: !current.warningEnabled }))}>
          {form.warningEnabled ? "Remove Warning Tier" : "+ Add Warning Tier"}
        </Button>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["warning", "critical"] as const).filter((tier) => tier === "critical" || form.warningEnabled).map((tier) => {
            const thresholdKey = tier === "warning" ? "warningThreshold" : "criticalThreshold";
            const durationKey = tier === "warning" ? "warningDurationSeconds" : "criticalDurationSeconds";
            return <div key={tier} className={tier === "warning" ? "space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4" : "space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4"}>
              <h3 className="font-medium capitalize">{tier} tier</h3>
              <div className="grid gap-2">
                <Label htmlFor={`edit-${tier}-threshold`}>Threshold (%)</Label>
                <Input id={`edit-${tier}-threshold`} type="number" min={0} max={100} step="any" required value={form[thresholdKey]}
                  onChange={(event) => setForm((current) => ({ ...current, [thresholdKey]: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`edit-${tier}-duration`}>Duration (seconds)</Label>
                <Input id={`edit-${tier}-duration`} type="number" min={10} step={1} required value={form[durationKey]}
                  onChange={(event) => setForm((current) => ({ ...current, [durationKey]: event.target.value }))} />
              </div>
            </div>;
          })}
        </div>
        {invalidHierarchy && <p className="text-sm text-rose-600">Warning must be {form.operator === ">" || form.operator === ">=" ? "below" : "above"} Critical.</p>}
        {mutation.isError && <p className="text-sm text-rose-600">{mutation.error instanceof Error ? mutation.error.message : "Failed to update metric rule"}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || !validThresholds || !validDurations || invalidHierarchy || configured.has(form.metricType)} className="bg-blue-600 text-white hover:bg-blue-700">
            {mutation.isPending && <LoaderCircle className="size-4 animate-spin" />}
            {mutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

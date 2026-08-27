"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Archive,
  Bell,
  ChartNoAxesCombined,
  LoaderCircle,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  useArchiveMetricRule,
  useDisableMetricRule,
  useEnableMetricRule,
  useUpdateMetricRule,
} from "../api/use-metric-rule-actions";
import { useMetricRules } from "../api/use-metric-rules";
import type {
  MetricRule,
  MetricRuleOperator,
  MetricRuleSeverity,
  MetricRuleType,
  UpdateMetricRuleInput,
} from "../types/metric-rule";

const metricLabels: Record<MetricRuleType, string> = {
  CPU_USAGE: "CPU Usage",
  MEMORY_USAGE: "Memory Usage",
  DISK_USAGE: "Disk Usage",
};

function formatDuration(seconds: number) {
  if (seconds === 0) return "Immediately";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "Never";
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function evaluationLabel(rule: MetricRule) {
  if (!rule.evaluation || rule.evaluation.dataStatus === "UNKNOWN")
    return "Unknown";
  if (rule.evaluation.dataStatus === "NO_DATA") return "No data";
  return {
    NORMAL: "Normal",
    VIOLATING: "Pending",
    ALERTED: "Alerting",
    RECOVERED: "Recovered",
  }[rule.evaluation.status];
}

function evaluationStyle(rule: MetricRule) {
  const label = evaluationLabel(rule);
  if (label === "Alerting") return "border-rose-200 bg-rose-50 text-rose-700";
  if (label === "Pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (label === "Normal" || label === "Recovered")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

export function MetricRulesTable() {
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<"ALL" | MetricRuleType>("ALL");
  const [severity, setSeverity] = useState<"ALL" | MetricRuleSeverity>("ALL");
  const [recordState, setRecordState] = useState<
    "CURRENT" | "ARCHIVED" | "ALL"
  >("CURRENT");
  const [evaluation, setEvaluation] = useState("ALL");
  const [editingRule, setEditingRule] = useState<MetricRule | null>(null);
  const rulesQuery = useMetricRules(true);
  const assetsQuery = useAssets();
  const enableMutation = useEnableMetricRule();
  const disableMutation = useDisableMetricRule();
  const archiveMutation = useArchiveMetricRule();
  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const assetById = useMemo(
    () =>
      new Map((assetsQuery.data ?? []).map((asset) => [asset.assetId, asset])),
    [assetsQuery.data],
  );

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const archived = Boolean(rule.archivedAt);
      const matchesRecord =
        recordState === "ALL" ||
        (recordState === "ARCHIVED" ? archived : !archived);
      const name = assetById.get(rule.assetId)?.name ?? "";
      return (
        matchesRecord &&
        (metric === "ALL" || rule.metricType === metric) &&
        (severity === "ALL" || rule.severity === severity) &&
        (evaluation === "ALL" || evaluationLabel(rule) === evaluation) &&
        (!query ||
          name.toLowerCase().includes(query) ||
          metricLabels[rule.metricType].toLowerCase().includes(query))
      );
    });
  }, [assetById, evaluation, metric, recordState, rules, search, severity]);

  const actionError =
    enableMutation.error ?? disableMutation.error ?? archiveMutation.error;
  if (rulesQuery.isLoading || assetsQuery.isLoading)
    return <MetricRulesSkeleton />;
  if (rulesQuery.isError || assetsQuery.isError)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-rose-600">
          Failed to load metric rules.
        </CardContent>
      </Card>
    );

  return (
    <>
      <Card className="overflow-hidden border-slate-200 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search asset or metric"
              className="w-full sm:w-60"
            />
            <Select
              value={metric}
              onValueChange={(value) =>
                setMetric((value ?? "ALL") as typeof metric)
              }
            >
              <SelectTrigger className="w-full bg-white sm:w-44">
                <SelectValue>
                  {metric === "ALL" ? "All metrics" : metricLabels[metric]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All metrics</SelectItem>
                <SelectItem value="CPU_USAGE">CPU Usage</SelectItem>
                <SelectItem value="MEMORY_USAGE">Memory Usage</SelectItem>
                <SelectItem value="DISK_USAGE">Disk Usage</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={severity}
              onValueChange={(value) =>
                setSeverity((value ?? "ALL") as typeof severity)
              }
            >
              <SelectTrigger className="w-full bg-white sm:w-40">
                <SelectValue>
                  {severity === "ALL"
                    ? "All severities"
                    : severity === "WARNING"
                      ? "Warning"
                      : "Critical"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All severities</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={evaluation}
              onValueChange={(value) => setEvaluation(value ?? "ALL")}
            >
              <SelectTrigger className="w-full bg-white sm:w-40">
                <SelectValue>
                  {evaluation === "ALL" ? "All evaluations" : evaluation}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All evaluations</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Alerting">Alerting</SelectItem>
                <SelectItem value="Recovered">Recovered</SelectItem>
                <SelectItem value="No data">No data</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={recordState}
              onValueChange={(value) =>
                setRecordState((value ?? "CURRENT") as typeof recordState)
              }
            >
              <SelectTrigger className="w-full bg-white sm:w-36">
                <SelectValue>
                  {recordState === "CURRENT"
                    ? "Current rules"
                    : recordState === "ARCHIVED"
                      ? "Archived rules"
                      : "All records"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CURRENT">Current rules</SelectItem>
                <SelectItem value="ARCHIVED">Archived rules</SelectItem>
                <SelectItem value="ALL">All records</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={
                !search &&
                metric === "ALL" &&
                severity === "ALL" &&
                evaluation === "ALL" &&
                recordState === "CURRENT"
              }
              onClick={() => {
                setSearch("");
                setMetric("ALL");
                setSeverity("ALL");
                setEvaluation("ALL");
                setRecordState("CURRENT");
              }}
            >
              <RotateCcw className="size-4" />
              Clear
            </Button>
            <span className={cn("ml-auto text-xs text-slate-500", (rulesQuery.isFetching || assetsQuery.isFetching) && "animate-pulse")}>
              {filteredRules.length} of {rules.length} rules
              {(rulesQuery.isFetching || assetsQuery.isFetching) && " · Updating"}
            </span>
          </div>
          {actionError && (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {actionError instanceof Error
                ? actionError.message
                : "Failed to update metric rule"}
            </div>
          )}
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Asset</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Rule status</TableHead>
                <TableHead>Evaluation</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead>Evaluated</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={cn("transition-opacity duration-150", (rulesQuery.isFetching || assetsQuery.isFetching) && "opacity-70")}>
              {filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-28 text-center text-slate-500"
                  >
                    No metric rules match the current view.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => {
                  const asset = assetById.get(rule.assetId);
                  const pendingId =
                    enableMutation.variables ??
                    disableMutation.variables ??
                    archiveMutation.variables;
                  const pending = pendingId === rule.ruleId;
                  return (
                    <TableRow key={rule.ruleId} className="transition-colors duration-150">
                      <TableCell className="pl-4 font-medium text-slate-900">
                        {asset?.name ?? "Unknown asset"}
                      </TableCell>
                      <TableCell>{metricLabels[rule.metricType]}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {rule.operator === "GREATER_THAN" ? ">" : ">="}{" "}
                        {rule.thresholdValue}% for{" "}
                        {formatDuration(rule.durationSeconds)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            rule.severity === "CRITICAL"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }
                        >
                          {rule.severity === "CRITICAL"
                            ? "Critical"
                            : "Warning"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {rule.archivedAt
                            ? "Archived"
                            : rule.enabled
                              ? "Enabled"
                              : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={evaluationStyle(rule)}
                        >
                          {evaluationLabel(rule)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.evaluation?.lastActualValue == null
                          ? "-"
                          : `${rule.evaluation.lastActualValue.toFixed(1)}%`}
                      </TableCell>
                      <TableCell>
                        {formatRelativeDate(rule.evaluation?.lastEvaluatedAt)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <AdminOnly>
                          <MenuPrimitive.Root>
                            <MenuPrimitive.Trigger
                              aria-label={`Actions for ${asset?.name ?? "metric rule"}`}
                              disabled={pending || Boolean(rule.archivedAt)}
                              className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
                            >
                              {pending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <MoreVertical className="size-4" />
                              )}
                            </MenuPrimitive.Trigger>
                            <MenuPrimitive.Portal>
                              <MenuPrimitive.Positioner
                                side="bottom"
                                align="end"
                                sideOffset={4}
                                className="z-50"
                              >
                                <MenuPrimitive.Popup className="min-w-48 rounded-md bg-white p-1 text-sm shadow-md ring-1 ring-slate-200 outline-none">
                                  <MenuItem
                                    icon={Pencil}
                                    label="Edit rule"
                                    onClick={() => setEditingRule(rule)}
                                  />
                                  {rule.enabled ? (
                                    <MenuItem
                                      icon={Pause}
                                      label="Disable"
                                      onClick={() =>
                                        disableMutation.mutate(rule.ruleId)
                                      }
                                    />
                                  ) : (
                                    <MenuItem
                                      icon={Play}
                                      label="Enable"
                                      onClick={() =>
                                        enableMutation.mutate(rule.ruleId)
                                      }
                                    />
                                  )}
                                  <MenuLink
                                    icon={ChartNoAxesCombined}
                                    label="View asset metrics"
                                    href={`/assets/${rule.assetId}/metrics`}
                                  />
                                  <MenuLink
                                    icon={Bell}
                                    label="View alerts"
                                    href="/alerts"
                                  />
                                  <MenuItem
                                    icon={Archive}
                                    label="Archive"
                                    destructive
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Archive this metric rule? Existing alert and audit history will remain available.",
                                        )
                                      )
                                        archiveMutation.mutate(rule.ruleId);
                                    }}
                                  />
                                </MenuPrimitive.Popup>
                              </MenuPrimitive.Positioner>
                            </MenuPrimitive.Portal>
                          </MenuPrimitive.Root>
                        </AdminOnly>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EditMetricRuleDialog
        key={editingRule?.ruleId ?? "closed"}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
      />
    </>
  );
}

function MetricRulesSkeleton() {
  return <Card className="overflow-hidden border-slate-200 shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap"><Skeleton className="h-8 w-full sm:w-60" />{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-full sm:w-40" />)}</div><Skeleton className="h-10 w-full rounded-none" />{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid h-16 grid-cols-[1fr_1fr_1.4fr_0.8fr_0.8fr] items-center gap-5 border-t border-slate-100 px-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-36" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div>)}</CardContent></Card>;
}

function MenuItem({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <MenuPrimitive.Item
      onClick={onClick}
      className={`flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100 ${destructive ? "text-rose-600" : ""}`}
    >
      <Icon className="size-4" />
      {label}
    </MenuPrimitive.Item>
  );
}

function MenuLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Play;
  label: string;
  href: string;
}) {
  return (
    <MenuPrimitive.Item
      render={<Link href={href} />}
      className="flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100"
    >
      <Icon className="size-4" />
      {label}
    </MenuPrimitive.Item>
  );
}

function EditMetricRuleDialog({
  rule,
  onClose,
}: {
  rule: MetricRule | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UpdateMetricRuleInput>(() => ({
    metricType: rule?.metricType ?? "CPU_USAGE",
    operator: rule?.operator ?? "GREATER_THAN_OR_EQUAL",
    thresholdValue: rule?.thresholdValue ?? 80,
    durationSeconds: rule?.durationSeconds ?? 300,
    severity: rule?.severity ?? "WARNING",
  }));
  const mutation = useUpdateMetricRule();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!rule) return;
    try {
      await mutation.mutateAsync({ ruleId: rule.ruleId, input: form });
      onClose();
    } catch {}
  }
  return (
    <Dialog
      open={Boolean(rule)}
      onOpenChange={(open) => {
        if (!open) {
          mutation.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit metric rule</DialogTitle>
          <DialogDescription>
            Changing the condition resolves any active alert for this rule and
            starts evaluation fresh.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_1.15fr_0.8fr]">
            <div className="grid gap-2">
              <Label>Metric</Label>
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
                value={form.operator}
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
                    Greater than or equal (&gt;=)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rule-threshold">Threshold (%)</Label>
              <Input
                id="edit-rule-threshold"
                type="number"
                min={0}
                max={100}
                value={form.thresholdValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    thresholdValue: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-rule-duration">Duration (seconds)</Label>
              <Input
                id="edit-rule-duration"
                type="number"
                min={0}
                value={form.durationSeconds}
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
          </div>
          {mutation.isError && (
            <p className="text-sm text-rose-600">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to update metric rule"}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="min-w-[7.5rem]">
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

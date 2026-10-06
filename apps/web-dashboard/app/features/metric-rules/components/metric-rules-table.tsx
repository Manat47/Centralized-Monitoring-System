"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
} from "../api/use-metric-rule-actions";
import { useMetricRules } from "../api/use-metric-rules";
import type {
  MetricRule,
  MetricRuleSeverity,
  MetricRuleType,
} from "../types/metric-rule";
import { EditMetricRuleDialog } from "./edit-metric-rule-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const metricLabels: Record<MetricRuleType, string> = {
  CPU_USAGE: "CPU Usage",
  MEMORY_USAGE: "Memory Usage",
  DISK_USAGE: "Disk Usage",
};

function formatDuration(seconds: number) {
  if (seconds === 0) return "Immediately";
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
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
  if (!rule.enabled || rule.archivedAt) return "Inactive";
  if (!rule.evaluation || rule.evaluation.dataStatus === "UNKNOWN")
    return "Unknown";
  if (rule.evaluation.dataStatus === "NO_DATA") return "No data";
  return {
    NORMAL: "Normal",
    VIOLATING: "Pending",
    ALERTED: "Alerting",
    RECOVERED: "Normal",
    WARNING: "Warning",
    CRITICAL: "Critical",
    NO_DATA: "No data",
    INACTIVE: "Inactive",
  }[rule.evaluation.status];
}

function evaluationStyle(rule: MetricRule) {
  const label = evaluationLabel(rule);
  if (label === "Critical" || label === "Alerting") return "border-rose-200 bg-rose-50 text-rose-700";
  if (label === "Warning" || label === "Pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (label === "Normal")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

export function MetricRulesTable({ selectedRuleId }: { selectedRuleId?: string }) {
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState<"ALL" | MetricRuleType>("ALL");
  const [severity, setSeverity] = useState<"ALL" | MetricRuleSeverity>("ALL");
  const [recordState, setRecordState] = useState<
    "CURRENT" | "ARCHIVED" | "ALL"
  >("CURRENT");
  const [evaluation, setEvaluation] = useState("ALL");
  const [manualEditingRule, setEditingRule] = useState<MetricRule | null>(null);
  const [dismissedRuleId, setDismissedRuleId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<MetricRule | null>(null);
  const rulesQuery = useMetricRules(true);
  const assetsQuery = useAssets();
  const enableMutation = useEnableMetricRule();
  const disableMutation = useDisableMetricRule();
  const archiveMutation = useArchiveMetricRule();
  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);
  const editingRule = manualEditingRule ?? (selectedRuleId !== dismissedRuleId
    ? rules.find((item) => item.ruleId === selectedRuleId) ?? null
    : null);
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
        (severity === "ALL" || rule.evaluation?.status === severity) &&
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
              <SelectContent
                alignItemWithTrigger={false}
                sideOffset={6}
                className="duration-150"
              >
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
              <SelectContent
                alignItemWithTrigger={false}
                sideOffset={6}
                className="duration-150"
              >
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
              <SelectContent
                alignItemWithTrigger={false}
                sideOffset={6}
                className="duration-150"
              >
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
              <SelectContent
                alignItemWithTrigger={false}
                sideOffset={6}
                className="duration-150"
              >
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
            <span
              className={cn(
                "ml-auto text-xs text-slate-500",
                (rulesQuery.isFetching || assetsQuery.isFetching) &&
                  "animate-pulse",
              )}
            >
              {filteredRules.length} of {rules.length} rules
              {(rulesQuery.isFetching || assetsQuery.isFetching) &&
                " · Updating"}
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
                <TableHead>Latest value</TableHead>
                <TableHead>Last evaluated</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn(
                "transition-opacity duration-150",
                (rulesQuery.isFetching || assetsQuery.isFetching) &&
                  "opacity-70",
              )}
            >
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
                    <TableRow
                      key={rule.ruleId}
                      className="transition-colors duration-150 hover:bg-slate-50/70"
                    >
                      <TableCell className="pl-4 font-medium text-slate-900">
                        {asset?.name ?? "Unknown asset"}
                      </TableCell>
                      <TableCell>{metricLabels[rule.metricType]}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {rule.warningEnabled !== false
                          ? <>Warn: {rule.operator} {rule.warningThreshold}% ({formatDuration(rule.warningDurationSeconds)})</>
                          : "Warn: Off"}
                        <span className="mx-1 text-slate-400">|</span>
                        Crit: {rule.operator} {rule.criticalThreshold}% ({formatDuration(rule.criticalDurationSeconds)})
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            rule.enabled && !rule.archivedAt && rule.evaluation?.status === "CRITICAL"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : rule.enabled && !rule.archivedAt && rule.evaluation?.status === "WARNING"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                          }
                        >
                          {rule.enabled && !rule.archivedAt && rule.evaluation?.status === "CRITICAL"
                            ? "Critical"
                            : rule.enabled && !rule.archivedAt && rule.evaluation?.status === "WARNING" ? "Warning" : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            rule.archivedAt
                              ? "border-slate-200 bg-slate-100 text-slate-600"
                              : rule.enabled
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-500"
                          }
                        >
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
                      <TableCell className={
                        rule.evaluation?.dataStatus !== "AVAILABLE" || !rule.enabled || rule.archivedAt
                          ? "text-slate-500"
                          : rule.evaluation.status === "CRITICAL"
                            ? "font-medium text-rose-700"
                            : rule.evaluation.status === "WARNING"
                              ? "font-medium text-amber-700"
                              : "font-medium text-emerald-700"
                      }>
                        {!rule.enabled || rule.evaluation?.dataStatus !== "AVAILABLE" || rule.evaluation?.lastActualValue == null
                          ? "-"
                          : `${rule.evaluation.lastActualValue.toFixed(1)}%`}
                      </TableCell>
                      <TableCell>
                        {!rule.enabled || rule.evaluation?.dataStatus !== "AVAILABLE"
                          ? "-"
                          : formatRelativeDate(rule.evaluation?.lastEvaluatedAt)}
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
                                    onClick={() => setArchiveTarget(rule)}
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

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open && !archiveMutation.isPending) {
            setArchiveTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-600">
              <Archive />
            </AlertDialogMedia>

            <AlertDialogTitle>Archive metric rule?</AlertDialogTitle>

            <AlertDialogDescription>
              This metric rule will stop being used for evaluation. Existing
              alert and audit history will remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              disabled={!archiveTarget || archiveMutation.isPending}
              onClick={() => {
                if (!archiveTarget) return;

                archiveMutation.mutate(archiveTarget.ruleId, {
                  onSuccess: () => setArchiveTarget(null),
                });
              }}
              className="min-w-[7.5rem]"
            >
              {archiveMutation.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditMetricRuleDialog
        key={editingRule?.ruleId ?? "closed"}
        rule={editingRule}
        onClose={() => {
          setEditingRule(null);
          setDismissedRuleId(selectedRuleId ?? null);
        }}
      />
    </>
  );
}

function MetricRulesSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-8 w-full sm:w-60" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full sm:w-40" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid h-16 grid-cols-[1fr_1fr_1.4fr_0.8fr_0.8fr] items-center gap-5 border-t border-slate-100 px-4"
          >
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
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

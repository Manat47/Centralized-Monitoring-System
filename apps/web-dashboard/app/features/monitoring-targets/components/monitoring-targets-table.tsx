"use client";

import { Fragment, useMemo, useState } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Archive,
  CircleAlert,
  LoaderCircle,
  MoreVertical,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { useAssets } from "@/app/features/assets/api/use-assets";
import type { Asset } from "@/app/features/assets/types/asset";
import { useMetricRules } from "@/app/features/metric-rules/api/use-metric-rules";
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
  useArchiveMonitoringTarget,
  useDisableMonitoringTarget,
  useEnableMonitoringTarget,
  useVerifyMonitoringTarget,
} from "../api/use-monitoring-target-actions";
import { useMonitoringTargets } from "../api/use-monitoring-targets";
import type {
  MonitoringTarget,
  VerificationStatus,
} from "../types/monitoring-target";

function getAssetAddress(asset: Asset | undefined): string {
  if (!asset) {
    return "—";
  }

  if (asset.targetType === "SERVER") {
    return asset.hostname?.trim() || asset.ipAddress?.trim() || "—";
  }

  if (!asset.endpoint) {
    return "—";
  }

  try {
    return new URL(asset.endpoint).hostname || asset.endpoint;
  } catch {
    return asset.endpoint;
  }
}

function getScrapeUrl(
  target: MonitoringTarget,
  asset: Asset | undefined,
): string {
  if (target.monitoringType === "NODE_EXPORTER") {
    if (!target.protocol) {
      return "—";
    }

    const protocol = target.protocol.toLowerCase();
    return `${protocol}://${getAssetAddress(asset)}:${target.port}${target.path}`;
  }

  if (!asset?.endpoint) {
    return "—";
  }

  try {
    const endpoint = new URL(asset.endpoint);
    endpoint.port = String(target.port);
    endpoint.pathname = target.path;
    endpoint.search = "";
    endpoint.hash = "";
    return endpoint.toString();
  } catch {
    return asset.endpoint;
  }
}

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return `${Math.floor(elapsedSeconds / 86400)}d ago`;
}

function formatVerification(status: VerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "Verified";
    case "FAILED":
      return "Failed";
    case "NOT_VERIFIED":
      return "Not verified";
  }
}

function getVerificationClass(status: VerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "NOT_VERIFIED":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getMonitoringState(target: MonitoringTarget, asset: Asset | undefined) {
  if (target.archivedAt) {
    return {
      label: "Archived",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  if (asset?.status === "DEACTIVATE") {
    return {
      label: "Retired",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  if (target.monitoringEnabled && asset?.status === "INACTIVATE") {
    return {
      label: "Enabled · Paused",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return target.monitoringEnabled
    ? {
        label: "Enabled",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      }
    : {
        label: "Disabled",
        className: "border-slate-200 bg-slate-100 text-slate-600",
      };
}

export function MonitoringTargetsTable() {
  const [search, setSearch] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<
    "ALL" | VerificationStatus
  >("ALL");
  const [monitoringStatus, setMonitoringStatus] = useState<
    "ALL" | "ENABLED" | "DISABLED"
  >("ALL");
  const [archiveFilter, setArchiveFilter] = useState<
    "CURRENT" | "ARCHIVED" | "ALL"
  >("CURRENT");
  const [archiveTarget, setArchiveTarget] = useState<MonitoringTarget | null>(
    null,
  );

  const targetsQuery = useMonitoringTargets(true);
  const assetsQuery = useAssets();
  const metricRulesQuery = useMetricRules();
  const verifyMutation = useVerifyMonitoringTarget();
  const enableMutation = useEnableMonitoringTarget();
  const disableMutation = useDisableMonitoringTarget();
  const archiveMutation = useArchiveMonitoringTarget();

  const targets = useMemo(
    () => targetsQuery.data ?? [],
    [targetsQuery.data],
  );
  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const assetById = useMemo(
    () => new Map(assets.map((asset) => [asset.assetId, asset])),
    [assets],
  );
  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return targets.filter((target) => {
      const asset = assetById.get(target.assetId);
      const assetName = asset?.name ?? "";
      const address = getAssetAddress(asset);
      const scrapeUrl = getScrapeUrl(target, asset);

      const matchesSearch =
        !normalizedSearch ||
        assetName.toLowerCase().includes(normalizedSearch) ||
        address.toLowerCase().includes(normalizedSearch) ||
        scrapeUrl.toLowerCase().includes(normalizedSearch);
      const matchesVerification =
        verificationStatus === "ALL" ||
        target.verificationStatus === verificationStatus;
      const matchesMonitoring =
        monitoringStatus === "ALL" ||
        (monitoringStatus === "ENABLED" && target.monitoringEnabled) ||
        (monitoringStatus === "DISABLED" && !target.monitoringEnabled);
      const matchesArchive =
        archiveFilter === "ALL" ||
        (archiveFilter === "ARCHIVED"
          ? Boolean(target.archivedAt)
          : !target.archivedAt);

      return (
        matchesSearch &&
        matchesVerification &&
        matchesMonitoring &&
        matchesArchive
      );
    });
  }, [
    archiveFilter,
    assetById,
    monitoringStatus,
    search,
    targets,
    verificationStatus,
  ]);

  const isLoading = targetsQuery.isLoading || assetsQuery.isLoading;
  const actionError =
    verifyMutation.error ??
    enableMutation.error ??
    disableMutation.error ??
    archiveMutation.error;
  const filtersActive =
    Boolean(search) ||
    verificationStatus !== "ALL" ||
    monitoringStatus !== "ALL" ||
    archiveFilter !== "CURRENT";
  const affectedRuleCount = useMemo(() => {
    if (!archiveTarget) {
      return 0;
    }

    return (metricRulesQuery.data ?? []).filter(
      (rule) => rule.assetId === archiveTarget.assetId && rule.enabled,
    ).length;
  }, [archiveTarget, metricRulesQuery.data]);

  if (isLoading) {
    return <MonitoringTargetsSkeleton />;
  }

  if (targetsQuery.isError || assetsQuery.isError) {
    const error = targetsQuery.error ?? assetsQuery.error;

    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-rose-600">
            Failed to load monitoring targets
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="overflow-hidden border-slate-200 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset, host or URL"
            className="w-full sm:w-64"
          />

          <Select
            value={verificationStatus}
            onValueChange={(value) =>
              setVerificationStatus(
                (value ?? "ALL") as "ALL" | VerificationStatus,
              )
            }
          >
            <SelectTrigger className="w-full bg-white sm:w-48">
              <SelectValue>
                {verificationStatus === "ALL"
                  ? "All verifications"
                  : formatVerification(verificationStatus)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All verifications</SelectItem>
              <SelectItem value="NOT_VERIFIED">Not verified</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={archiveFilter}
            onValueChange={(value) =>
              setArchiveFilter(
                (value ?? "CURRENT") as "CURRENT" | "ARCHIVED" | "ALL",
              )
            }
          >
            <SelectTrigger className="w-full bg-white sm:w-40">
              <SelectValue>
                {archiveFilter === "CURRENT"
                  ? "Current"
                  : archiveFilter === "ARCHIVED"
                    ? "Archived"
                    : "All records"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CURRENT">Current</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="ALL">All records</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={monitoringStatus}
            onValueChange={(value) =>
              setMonitoringStatus(
                (value ?? "ALL") as "ALL" | "ENABLED" | "DISABLED",
              )
            }
          >
            <SelectTrigger className="w-full bg-white sm:w-40">
              <SelectValue>
                {monitoringStatus === "ALL"
                  ? "All states"
                  : monitoringStatus === "ENABLED"
                    ? "Enabled"
                    : "Disabled"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All states</SelectItem>
              <SelectItem value="ENABLED">Enabled</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!filtersActive}
            onClick={() => {
              setSearch("");
              setVerificationStatus("ALL");
              setMonitoringStatus("ALL");
              setArchiveFilter("CURRENT");
            }}
          >
            <RotateCcw className="size-4" />
            Clear
          </Button>

          <span className={cn("ml-auto text-xs text-slate-500", (targetsQuery.isFetching || assetsQuery.isFetching) && "animate-pulse")}>
            {filteredTargets.length} of {targets.length} targets
            {(targetsQuery.isFetching || assetsQuery.isFetching) && " · Updating"}
          </span>
        </div>

        {actionError && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError instanceof Error
              ? actionError.message
              : "Failed to update monitoring target"}
          </div>
        )}

        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Asset</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Metrics Path</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Monitoring</TableHead>
              <TableHead>Last verified</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className={cn("transition-opacity duration-150", (targetsQuery.isFetching || assetsQuery.isFetching) && "opacity-70")}>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-28 text-center text-slate-500">
                  No monitoring targets found.
                </TableCell>
              </TableRow>
            ) : filteredTargets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-28 text-center text-slate-500">
                  No targets match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTargets.map((target) => {
                const asset = assetById.get(target.assetId);
                const monitoringState = getMonitoringState(target, asset);
                const isPending =
                  (verifyMutation.isPending &&
                    verifyMutation.variables === target.targetId) ||
                  (enableMutation.isPending &&
                    enableMutation.variables === target.targetId) ||
                  (disableMutation.isPending &&
                    disableMutation.variables === target.targetId) ||
                  (archiveMutation.isPending &&
                    archiveMutation.variables === target.targetId);
                const isArchived = Boolean(target.archivedAt);
                const isReadOnly = asset?.status === "DEACTIVATE";
                const needsReverification =
                  target.verificationStatus !== "VERIFIED";
                const canReverify = asset?.status === "ACTIVATE";
                const canEnable =
                  !isReadOnly &&
                  !target.monitoringEnabled &&
                  target.verificationStatus === "VERIFIED";
                const canDisable = !isReadOnly && target.monitoringEnabled;

                return (
                  <Fragment key={target.targetId}>
                    <TableRow className={cn("transition-colors duration-150", target.lastError && "border-b-0")}>
                      <TableCell className="pl-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {asset?.name ?? "Unknown asset"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {asset?.status === "INACTIVATE"
                              ? "Inactive asset"
                              : asset?.status === "DEACTIVATE"
                                ? "Deactivated asset"
                                : "Server"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{target.protocol ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {getAssetAddress(asset)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {target.port}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {target.path}
                      </TableCell>
                      <TableCell>{target.scrapeIntervalSeconds}s</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getVerificationClass(
                            target.verificationStatus,
                          )}
                        >
                          {formatVerification(target.verificationStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={monitoringState.className}
                        >
                          {monitoringState.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatRelativeDate(target.lastVerifiedAt)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <AdminOnly>
                          <MenuPrimitive.Root>
                            <MenuPrimitive.Trigger
                              aria-label={`Actions for ${asset?.name ?? "monitoring target"}`}
                              title="Actions"
                              disabled={isPending}
                              className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50"
                            >
                              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
                            </MenuPrimitive.Trigger>
                            <MenuPrimitive.Portal>
                              <MenuPrimitive.Positioner
                                side="bottom"
                                align="end"
                                sideOffset={4}
                                className="z-50"
                              >
                                <MenuPrimitive.Popup className="min-w-40 rounded-md bg-white p-1 text-sm text-slate-900 shadow-md ring-1 ring-slate-200 outline-none">
                                  {isArchived ? (
                                    <MenuPrimitive.Item
                                      disabled
                                      className="flex cursor-default items-center gap-2 rounded px-2 py-2 text-slate-400 outline-none"
                                    >
                                      Archived
                                    </MenuPrimitive.Item>
                                  ) : (
                                    <>
                                      {isReadOnly ? (
                                        <MenuPrimitive.Item
                                          disabled
                                          className="flex cursor-default items-center gap-2 rounded px-2 py-2 text-slate-400 outline-none"
                                        >
                                          Read-only
                                        </MenuPrimitive.Item>
                                      ) : canDisable ? (
                                        <MenuPrimitive.Item
                                          onClick={() =>
                                            disableMutation.mutate(target.targetId)
                                          }
                                          className="flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100"
                                        >
                                          <Pause className="size-4" />
                                          Disable
                                        </MenuPrimitive.Item>
                                      ) : needsReverification ? (
                                        <MenuPrimitive.Item
                                          disabled={!canReverify}
                                          title={
                                            canReverify
                                              ? "Verify the current monitoring endpoint"
                                              : "Activate the asset before re-verifying"
                                          }
                                          onClick={() =>
                                            verifyMutation.mutate(target.targetId)
                                          }
                                          className="flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100 data-disabled:text-slate-400"
                                        >
                                          <RefreshCw className="size-4" />
                                          Re-verify
                                        </MenuPrimitive.Item>
                                      ) : (
                                        <MenuPrimitive.Item
                                          disabled={!canEnable}
                                          onClick={() =>
                                            enableMutation.mutate(target.targetId)
                                          }
                                          className="flex cursor-default items-center gap-2 rounded px-2 py-2 outline-none data-highlighted:bg-slate-100 data-disabled:text-slate-400"
                                        >
                                          <Play className="size-4" />
                                          Enable
                                        </MenuPrimitive.Item>
                                      )}
                                      <div className="my-1 border-t border-slate-100" />
                                      <MenuPrimitive.Item
                                        onClick={() => setArchiveTarget(target)}
                                        className="flex cursor-default items-center gap-2 rounded px-2 py-2 text-rose-600 outline-none data-highlighted:bg-rose-50"
                                      >
                                        <Archive className="size-4" />
                                        Archive
                                      </MenuPrimitive.Item>
                                    </>
                                  )}
                                </MenuPrimitive.Popup>
                              </MenuPrimitive.Positioner>
                            </MenuPrimitive.Portal>
                          </MenuPrimitive.Root>
                        </AdminOnly>
                      </TableCell>
                    </TableRow>

                    {target.lastError && (
                      <TableRow className="border-rose-100 bg-rose-50/70 hover:bg-rose-50/70">
                        <TableCell
                          colSpan={10}
                          className="px-4 py-3 text-xs text-rose-700"
                        >
                          <span className="inline-flex items-center gap-2">
                            <CircleAlert className="size-4 shrink-0" />
                            <strong>{asset?.name ?? "Unknown asset"}:</strong>
                            <span className="break-all font-mono">
                              {target.lastError}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open && !archiveMutation.isPending) {
            setArchiveTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive monitoring target?</DialogTitle>
            <DialogDescription>
              Collection will stop, but target configuration, metrics, alerts,
              and audit history will remain available.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {affectedRuleCount > 0
              ? `${affectedRuleCount} enabled metric ${affectedRuleCount === 1 ? "rule" : "rules"} will move to No data. Any active metric alerts will be resolved as target archived.`
              : "Any active metric alerts will be resolved as target archived."}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={archiveMutation.isPending}
              onClick={() => setArchiveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!archiveTarget || archiveMutation.isPending}
              onClick={() => {
                if (!archiveTarget) return;
                archiveMutation.mutate(archiveTarget.targetId, {
                  onSuccess: () => setArchiveTarget(null),
                });
              }}
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MonitoringTargetsSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap">
          <Skeleton className="h-8 w-full sm:w-64" />
          <Skeleton className="h-8 w-full sm:w-48" />
          <Skeleton className="h-8 w-full sm:w-40" />
        </div>
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid h-16 grid-cols-[1.3fr_0.7fr_1fr_0.7fr_1fr] items-center gap-5 border-t border-slate-100 px-4">
            <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

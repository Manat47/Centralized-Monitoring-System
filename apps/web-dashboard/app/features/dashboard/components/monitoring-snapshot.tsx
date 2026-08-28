"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { useCpuUsage } from "@/app/features/monitoring-targets/api/use-cpu-usage";
import { useMemoryUsage } from "@/app/features/monitoring-targets/api/use-memory-usage";
import { useMetricsSummary } from "@/app/features/monitoring-targets/api/use-metrics-summary";
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";
import { useNetworkRate } from "@/app/features/monitoring-targets/api/use-network-rate";
import type { CpuUsageDataPoint } from "@/app/features/monitoring-targets/types/cpu-usage";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MiniLineChart } from "./mini-line-chart";

function averageCpuByTimestamp(points: CpuUsageDataPoint[]) {
  const groups = new Map<
    string,
    {
      total: number;
      count: number;
    }
  >();

  for (const point of points) {
    const current = groups.get(point.timestamp) ?? {
      total: 0,
      count: 0,
    };

    current.total += point.usagePercent;
    current.count += 1;

    groups.set(point.timestamp, current);
  }

  return Array.from(groups.entries())
    .map(([timestamp, group]) => ({
      timestamp,
      value: group.total / group.count,
    }))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function aggregateNetworkByTimestamp(
  points: {
    timestamp: string;
    receiveBytesPerSecond: number;
    transmitBytesPerSecond: number;
  }[],
) {
  const groups = new Map<
    string,
    {
      receive: number;
      transmit: number;
    }
  >();

  for (const point of points) {
    const current = groups.get(point.timestamp) ?? {
      receive: 0,
      transmit: 0,
    };

    current.receive += point.receiveBytesPerSecond;
    current.transmit += point.transmitBytesPerSecond;

    groups.set(point.timestamp, current);
  }

  return Array.from(groups.entries())
    .map(([timestamp, values]) => ({
      timestamp,
      ...values,
    }))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatBytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} GB`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} KB`;
  }

  return `${value.toFixed(0)} B`;
}

function formatBytesPerSecond(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} GB/s`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB/s`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} KB/s`;
  }

  return `${value.toFixed(0)} B/s`;
}

function MonitoringSnapshotSkeleton() {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="space-y-2">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="h-8 w-40 animate-pulse rounded-md bg-slate-100" />
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="space-y-2 border-b border-slate-100 pb-3">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
              </div>

              <div className="mt-4 h-28 animate-pulse rounded-md bg-slate-50" />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />

          <div className="mt-4 space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index}>
                <div className="mb-2 flex justify-between">
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
                </div>

                <div className="h-1.5 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-32 animate-pulse rounded-md bg-slate-50" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MonitoringSnapshot() {
  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();

  const monitoredAssetIds = useMemo(() => {
    return new Set(
      (targetsQuery.data ?? [])
        .filter((target) => target.monitoringEnabled)
        .map((target) => target.assetId),
    );
  }, [targetsQuery.data]);

  const monitoredAssets = useMemo(() => {
    return (assetsQuery.data ?? []).filter((asset) =>
      monitoredAssetIds.has(asset.assetId),
    );
  }, [assetsQuery.data, monitoredAssetIds]);

  const [selectedAssetId, setSelectedAssetId] = useState("");

  const effectiveSelectedAssetId = monitoredAssets.some(
    (asset) => asset.assetId === selectedAssetId,
  )
    ? selectedAssetId
    : (monitoredAssets[0]?.assetId ?? "");

  const selectedAsset = monitoredAssets.find(
    (asset) => asset.assetId === effectiveSelectedAssetId,
  );

  const cpuQuery = useCpuUsage({
    assetId: effectiveSelectedAssetId,
    rangeMinutes: 30,
  });

  const memoryQuery = useMemoryUsage({
    assetId: effectiveSelectedAssetId,
    rangeMinutes: 30,
  });

  const networkQuery = useNetworkRate({
    assetId: effectiveSelectedAssetId,
    rangeMinutes: 30,
  });

  const summaryQuery = useMetricsSummary({
    assetId: effectiveSelectedAssetId,
    rangeMinutes: 30,
  });

  const summary = summaryQuery.data;

  const cpuData = averageCpuByTimestamp(cpuQuery.data ?? []);

  const memoryData = memoryQuery.data ?? [];

  const networkData = aggregateNetworkByTimestamp(networkQuery.data ?? []);

  const latestNetwork =
    (summary?.networks?.length ?? 0) > 0
      ? (summary?.networks ?? []).reduce(
          (total, network) => ({
            receive: total.receive + (network.receiveBytesPerSecond ?? 0),
            transmit: total.transmit + (network.transmitBytesPerSecond ?? 0),
          }),
          {
            receive: 0,
            transmit: 0,
          },
        )
      : null;

  if (assetsQuery.isLoading || targetsQuery.isLoading) {
    return <MonitoringSnapshotSkeleton />;
  }

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="size-4 text-blue-600" />
            Monitoring Snapshot
          </CardTitle>

          <p className="mt-1 text-xs text-slate-500">
            Infrastructure metrics from the last 30 minutes
          </p>
        </div>

        {monitoredAssets.length > 0 && (
          <Select
            value={effectiveSelectedAssetId}
            onValueChange={(value) => {
              if (value) {
                setSelectedAssetId(value);
              }
            }}
          >
            <SelectTrigger className="h-8 min-w-40 max-w-56 bg-white text-xs font-medium">
              <SelectValue>{selectedAsset?.name ?? "Select asset"}</SelectValue>
            </SelectTrigger>

            <SelectContent
              side="bottom"
              align="end"
              sideOffset={6}
              alignItemWithTrigger={false}
              className="duration-150"
            >
              {monitoredAssets.map((asset) => (
                <SelectItem key={asset.assetId} value={asset.assetId}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent className="p-5">
        {monitoredAssets.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No monitored assets
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Enable a monitoring target to view metrics.
            </p>
          </div>
        ) : (
          <div
            key={effectiveSelectedAssetId}
            className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {selectedAsset?.name ?? "Unknown asset"}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedAsset?.ipAddress ??
                    selectedAsset?.hostname ??
                    selectedAsset?.endpoint ??
                    "No address"}
                </p>
              </div>

              {summaryQuery.isFetching && (
                <span className="text-[11px] text-slate-400">Updating...</span>
              )}
            </div>

            <div className="space-y-5">
              {/* CPU + Memory */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        CPU Usage
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatPercent(summary?.cpu.averageUsagePercent)}
                    </span>
                  </div>

                  <MiniLineChart
                    unit="%"
                    min={0}
                    max={100}
                    height={115}
                    area
                    series={[
                      {
                        name: "CPU",
                        color: "#2563eb",
                        data: cpuData.map((point) => [
                          point.timestamp,
                          point.value,
                        ]),
                      },
                    ]}
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-700">
                      Memory Usage
                    </p>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatPercent(summary?.memory?.usagePercent)}
                    </span>
                  </div>

                  <MiniLineChart
                    unit="%"
                    min={0}
                    max={100}
                    height={115}
                    area
                    series={[
                      {
                        name: "Memory",
                        color: "#0891b2",
                        data: memoryData.map((point) => [
                          point.timestamp,
                          point.usagePercent,
                        ]),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Disk */}
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-700">
                    Disk Usage
                  </p>
                </div>

                {(summary?.disks?.length ?? 0) === 0 ? (
                  <div className="flex h-16 items-center justify-center text-xs text-slate-400">
                    No disk metrics collected
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(summary?.disks ?? []).slice(0, 3).map((disk) => {
                      const usage = disk.usagePercent ?? 0;

                      return (
                        <div key={`${disk.device}-${disk.mountpoint}`}>
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-slate-700">
                                {disk.mountpoint}
                              </span>

                              <span className="ml-2 text-[10px] text-slate-400">
                                {disk.device} · {formatBytes(disk.totalBytes)}
                              </span>
                            </div>

                            <span className="shrink-0 text-xs font-medium text-slate-600">
                              {formatPercent(disk.usagePercent)}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
                              style={{
                                width: `${Math.min(Math.max(usage, 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Network */}
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      Network Throughput
                    </p>

                    <div className="mt-1 flex items-center gap-4 text-[10px]">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="size-2 rounded-full bg-blue-600" />
                        RX {formatBytesPerSecond(latestNetwork?.receive)}
                      </span>

                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        TX {formatBytesPerSecond(latestNetwork?.transmit)}
                      </span>
                    </div>
                  </div>
                </div>

                <MiniLineChart
                  height={135}
                  valueFormatter={formatBytesPerSecond}
                  series={[
                    {
                      name: "Receive",
                      color: "#2563eb",
                      data: networkData.map((point) => [
                        point.timestamp,
                        point.receive,
                      ]),
                    },
                    {
                      name: "Transmit",
                      color: "#10b981",
                      data: networkData.map((point) => [
                        point.timestamp,
                        point.transmit,
                      ]),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

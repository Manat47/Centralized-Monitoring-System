"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDiskUsage } from "../api/use-disk-usage";
import type { DiskUsageDataPoint } from "../types/disk-usage";
import { MetricChartStatsRow } from "./metric-chart-stats";
import {
  calculateMetricStats,
  formatBytes,
  formatPercent,
  getThresholdColor,
  type MetricThreshold,
} from "./metric-chart-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface DiskUsageChartProps {
  assetId: string;
  rangeMinutes?: number;
  thresholds?: MetricThreshold[];
}

function createDiskKey(point: DiskUsageDataPoint): string {
  return `${point.device} (${point.mountpoint})`;
}

function getMaximumUsageByTimestamp(data: DiskUsageDataPoint[]): number[] {
  const maximumByTimestamp = new Map<string, number>();

  for (const point of data) {
    maximumByTimestamp.set(
      point.timestamp,
      Math.max(
        maximumByTimestamp.get(point.timestamp) ?? 0,
        point.usagePercent,
      ),
    );
  }

  return Array.from(maximumByTimestamp.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([, value]) => value);
}

function getLatestByDisk(data: DiskUsageDataPoint[]): DiskUsageDataPoint[] {
  const latestByDisk = new Map<string, DiskUsageDataPoint>();

  for (const point of data) {
    const key = createDiskKey(point);
    const current = latestByDisk.get(key);

    if (!current || new Date(point.timestamp) > new Date(current.timestamp)) {
      latestByDisk.set(key, point);
    }
  }

  return Array.from(latestByDisk.values()).sort((a, b) =>
    createDiskKey(a).localeCompare(createDiskKey(b)),
  );
}

export function DiskUsageChart({
  assetId,
  rangeMinutes = 30,
  thresholds = [],
}: DiskUsageChartProps) {
  const [selectedDisk, setSelectedDisk] = useState("ALL");
  const diskQuery = useDiskUsage({ assetId, rangeMinutes });

  if (diskQuery.isLoading) {
    return <ChartMessage message="Loading disk chart..." />;
  }

  if (diskQuery.isError) {
    return <ChartMessage message="Failed to load disk usage" destructive />;
  }

  const data = [...(diskQuery.data ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const diskKeys = Array.from(new Set(data.map(createDiskKey)));
  const visibleDiskKeys = selectedDisk === "ALL" ? diskKeys : [selectedDisk];
  const visibleData = data.filter((point) =>
    visibleDiskKeys.includes(createDiskKey(point)),
  );
  const stats = calculateMetricStats(
    selectedDisk === "ALL"
      ? getMaximumUsageByTimestamp(visibleData)
      : visibleData.map((point) => point.usagePercent),
  );
  const latestRows = getLatestByDisk(visibleData);

  const option: EChartsOption = {
    color: ["#2563eb", "#0ea5e9", "#0f766e", "#7c3aed", "#d97706"],
    animationDuration: 300,
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const firstValue = Array.isArray(items[0]?.value) ? items[0].value : [];
        const lines = firstValue[0]
          ? [new Date(String(firstValue[0])).toLocaleString("th-TH")]
          : [];

        for (const item of items) {
          const values = Array.isArray(item.value) ? item.value : [];
          lines.push(
            `${String(item.seriesName)}: ${formatPercent(Number(values[1]))}`,
          );
        }

        return lines.join("<br/>");
      },
    },
    legend: { type: "scroll", top: 0, textStyle: { color: "#475569" } },
    grid: { left: 54, right: 24, top: 48, bottom: 42 },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { color: "#64748b" },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: "#64748b", formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    },
    dataZoom: [{ type: "inside" }],
    series: visibleDiskKeys.map((diskKey, index) => ({
      name: diskKey,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      data: visibleData
        .filter((point) => createDiskKey(point) === diskKey)
        .map((point) => [point.timestamp, point.usagePercent]),
      markLine:
        index === 0 && thresholds.length > 0
          ? {
              silent: true,
              symbol: "none",
              data: thresholds.map((threshold) => ({
                name: `${threshold.severity === "CRITICAL" ? "Critical" : "Warning"} ${threshold.value}%`,
                yAxis: threshold.value,
                lineStyle: {
                  color: getThresholdColor(threshold.severity),
                  type: "dashed",
                },
                label: { color: getThresholdColor(threshold.severity) },
              })),
            }
          : undefined,
    })),
  };

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Disk Usage</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Per-device filesystem utilization
          </p>
        </div>

        <Select
          value={selectedDisk}
          onValueChange={(value) => value && setSelectedDisk(value)}
        >
          <SelectTrigger className="w-52 bg-white">
            <SelectValue>
              {selectedDisk === "ALL" ? "All devices" : selectedDisk}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            sideOffset={6}
            className="duration-150"
          >
            <SelectItem value="ALL">All devices</SelectItem>
            {diskKeys.map((diskKey) => (
              <SelectItem key={diskKey} value={diskKey}>
                {diskKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <MetricChartStatsRow stats={stats} formatter={formatPercent} />
        {visibleData.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No disk usage data found.
          </div>
        ) : (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ height: 320, width: "100%" }}
          />
        )}

        {latestRows.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Mount</TableHead>
                  <TableHead>Filesystem</TableHead>
                  <TableHead>Latest</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestRows.map((point) => (
                  <TableRow key={createDiskKey(point)}>
                    <TableCell className="font-mono text-xs">
                      {point.device}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {point.mountpoint}
                    </TableCell>
                    <TableCell>{point.filesystemType}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPercent(point.usagePercent)}
                    </TableCell>
                    <TableCell>{formatBytes(point.usedBytes)}</TableCell>
                    <TableCell>{formatBytes(point.availableBytes)}</TableCell>
                    <TableCell>{formatBytes(point.totalBytes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartMessage({
  message,
  destructive = false,
}: {
  message: string;
  destructive?: boolean;
}) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardContent
        className={`py-16 text-center text-sm ${destructive ? "text-rose-600" : "text-slate-500"}`}
      >
        {message}
      </CardContent>
    </Card>
  );
}

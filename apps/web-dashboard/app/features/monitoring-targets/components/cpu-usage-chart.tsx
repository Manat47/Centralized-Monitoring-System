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

import { useCpuUsage } from "../api/use-cpu-usage";
import type { CpuUsageDataPoint } from "../types/cpu-usage";
import { MetricChartStatsRow } from "./metric-chart-stats";
import {
  calculateMetricStats,
  formatPercent,
  getThresholdColor,
  type MetricThreshold,
} from "./metric-chart-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface CpuUsageChartProps {
  assetId: string;
  rangeMinutes?: number;
  thresholds?: MetricThreshold[];
}

interface CpuChartPoint {
  timestamp: string;
  usagePercent: number;
}

function averageByTimestamp(points: CpuUsageDataPoint[]): CpuChartPoint[] {
  const groups = new Map<string, { total: number; count: number }>();

  for (const point of points) {
    const group = groups.get(point.timestamp) ?? { total: 0, count: 0 };
    group.total += point.usagePercent;
    group.count += 1;
    groups.set(point.timestamp, group);
  }

  return Array.from(groups, ([timestamp, group]) => ({
    timestamp,
    usagePercent: group.total / group.count,
  })).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function CpuUsageChart({
  assetId,
  rangeMinutes = 30,
  thresholds = [],
}: CpuUsageChartProps) {
  const [selectedCpu, setSelectedCpu] = useState("ALL");
  const cpuQuery = useCpuUsage({ assetId, rangeMinutes });

  if (cpuQuery.isLoading) {
    return <ChartMessage message="Loading CPU chart..." />;
  }

  if (cpuQuery.isError) {
    return <ChartMessage message="Failed to load CPU usage" destructive />;
  }

  const rawData = cpuQuery.data ?? [];
  const cpuCores = Array.from(new Set(rawData.map((point) => point.cpu))).sort();
  const data =
    selectedCpu === "ALL"
      ? averageByTimestamp(rawData)
      : rawData
          .filter((point) => point.cpu === selectedCpu)
          .map((point) => ({
            timestamp: point.timestamp,
            usagePercent: point.usagePercent,
          }))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() -
              new Date(b.timestamp).getTime(),
          );
  const stats = calculateMetricStats(data.map((point) => point.usagePercent));

  const option: EChartsOption = {
    color: ["#2563eb"],
    animationDuration: 300,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatPercent(Number(value)),
    },
    grid: { left: 54, right: 24, top: 20, bottom: 42 },
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
    series: [
      {
        name: selectedCpu === "ALL" ? "All cores (avg)" : selectedCpu,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { color: "rgba(37, 99, 235, 0.08)" },
        data: data.map((point) => [point.timestamp, point.usagePercent]),
        markLine:
          thresholds.length > 0
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
      },
    ],
  };

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">CPU Usage</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Per-core utilization from node exporter
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{cpuCores.length} cores</span>
          <Select
            value={selectedCpu}
            onValueChange={(value) => value && setSelectedCpu(value)}
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue>
                {selectedCpu === "ALL" ? "All cores (avg)" : selectedCpu}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All cores (avg)</SelectItem>
              {cpuCores.map((cpu) => (
                <SelectItem key={cpu} value={cpu}>
                  {cpu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <MetricChartStatsRow stats={stats} formatter={formatPercent} />
        {data.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No CPU usage data found.
          </div>
        ) : (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ height: 320, width: "100%" }}
          />
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

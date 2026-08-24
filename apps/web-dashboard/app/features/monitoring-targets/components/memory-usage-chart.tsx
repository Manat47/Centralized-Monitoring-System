"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMemoryUsage } from "../api/use-memory-usage";
import { MetricChartStatsRow } from "./metric-chart-stats";
import {
  calculateMetricStats,
  formatBytes,
  formatPercent,
  getThresholdColor,
  type MetricThreshold,
} from "./metric-chart-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface MemoryUsageChartProps {
  assetId: string;
  rangeMinutes?: number;
  thresholds?: MetricThreshold[];
}

export function MemoryUsageChart({
  assetId,
  rangeMinutes = 30,
  thresholds = [],
}: MemoryUsageChartProps) {
  const memoryQuery = useMemoryUsage({ assetId, rangeMinutes });

  if (memoryQuery.isLoading) {
    return <ChartMessage message="Loading memory chart..." />;
  }

  if (memoryQuery.isError) {
    return <ChartMessage message="Failed to load memory usage" destructive />;
  }

  const data = [...(memoryQuery.data ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const stats = calculateMetricStats(data.map((point) => point.usagePercent));
  const latest = data[data.length - 1];

  const option: EChartsOption = {
    color: ["#0f766e"],
    animationDuration: 300,
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const first = items[0];

        if (!first || typeof first.dataIndex !== "number") return "";

        const point = data[first.dataIndex];
        if (!point) return "";

        return [
          new Date(point.timestamp).toLocaleString("th-TH"),
          `Usage: ${formatPercent(point.usagePercent)}`,
          `Used: ${formatBytes(point.usedBytes)}`,
          `Available: ${formatBytes(point.availableBytes)}`,
          `Total: ${formatBytes(point.totalBytes)}`,
        ].join("<br/>");
      },
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
        name: "Memory usage",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        areaStyle: { color: "rgba(15, 118, 110, 0.08)" },
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
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-sm">Memory Usage</CardTitle>
        <p className="mt-1 text-xs text-slate-500">
          Machine-level memory utilization
        </p>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <MetricChartStatsRow stats={stats} formatter={formatPercent} />
        {data.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No memory usage data found.
          </div>
        ) : (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ height: 320, width: "100%" }}
          />
        )}

        {latest && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>Used <strong className="text-slate-900">{formatBytes(latest.usedBytes)}</strong></span>
            <span>Available <strong className="text-slate-900">{formatBytes(latest.availableBytes)}</strong></span>
            <span>Total <strong className="text-slate-900">{formatBytes(latest.totalBytes)}</strong></span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartMessage({ message, destructive = false }: { message: string; destructive?: boolean }) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardContent className={`py-16 text-center text-sm ${destructive ? "text-rose-600" : "text-slate-500"}`}>
        {message}
      </CardContent>
    </Card>
  );
}

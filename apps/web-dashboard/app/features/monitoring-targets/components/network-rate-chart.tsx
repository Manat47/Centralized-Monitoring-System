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

import { useNetworkRate } from "../api/use-network-rate";
import type { NetworkRateDataPoint } from "../types/network-rate";
import { MetricChartStatsRow } from "./metric-chart-stats";
import {
  calculateMetricStats,
  formatBytesPerSecond,
} from "./metric-chart-utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface NetworkRateChartProps {
  assetId: string;
  rangeMinutes?: number;
}

interface NetworkChartPoint {
  timestamp: string;
  receiveBytesPerSecond: number;
  transmitBytesPerSecond: number;
}

function aggregateByTimestamp(
  data: NetworkRateDataPoint[],
): NetworkChartPoint[] {
  const aggregate = new Map<string, NetworkChartPoint>();

  for (const point of data) {
    const current = aggregate.get(point.timestamp) ?? {
      timestamp: point.timestamp,
      receiveBytesPerSecond: 0,
      transmitBytesPerSecond: 0,
    };

    current.receiveBytesPerSecond += point.receiveBytesPerSecond;
    current.transmitBytesPerSecond += point.transmitBytesPerSecond;
    aggregate.set(point.timestamp, current);
  }

  return Array.from(aggregate.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function NetworkRateChart({
  assetId,
  rangeMinutes = 30,
}: NetworkRateChartProps) {
  const [selectedDevice, setSelectedDevice] = useState("ALL");
  const networkQuery = useNetworkRate({ assetId, rangeMinutes });

  if (networkQuery.isLoading) {
    return <ChartMessage message="Loading network chart..." />;
  }

  if (networkQuery.isError) {
    return <ChartMessage message="Failed to load network rate" destructive />;
  }

  const rawData = networkQuery.data ?? [];
  const devices = Array.from(
    new Set(rawData.map((point) => point.device)),
  ).sort();
  const data = aggregateByTimestamp(
    selectedDevice === "ALL"
      ? rawData
      : rawData.filter((point) => point.device === selectedDevice),
  );
  const receiveStats = calculateMetricStats(
    data.map((point) => point.receiveBytesPerSecond),
  );
  const transmitStats = calculateMetricStats(
    data.map((point) => point.transmitBytesPerSecond),
  );

  const option: EChartsOption = {
    color: ["#059669", "#2563eb"],
    animationDuration: 300,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatBytesPerSecond(Number(value)),
    },
    legend: { top: 0, textStyle: { color: "#475569" } },
    grid: { left: 72, right: 24, top: 48, bottom: 42 },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisLabel: { color: "#64748b" },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => formatBytesPerSecond(value),
      },
      splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    },
    dataZoom: [{ type: "inside" }],
    series: [
      {
        name: "RX",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        data: data.map((point) => [
          point.timestamp,
          point.receiveBytesPerSecond,
        ]),
      },
      {
        name: "TX",
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        data: data.map((point) => [
          point.timestamp,
          point.transmitBytesPerSecond,
        ]),
      },
    ],
  };

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Network</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Receive and transmit rates per interface
          </p>
        </div>

        <Select
          value={selectedDevice}
          onValueChange={(value) => value && setSelectedDevice(value)}
        >
          <SelectTrigger className="w-44 bg-white">
            <SelectValue>
              {selectedDevice === "ALL" ? "All interfaces" : selectedDevice}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            sideOffset={6}
            className="duration-150"
          >
            <SelectItem value="ALL">All interfaces</SelectItem>
            {devices.map((device) => (
              <SelectItem key={device} value={device}>
                {device}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="space-y-3">
          <MetricChartStatsRow
            label="RX"
            stats={receiveStats}
            formatter={formatBytesPerSecond}
            accentClassName="bg-emerald-600"
          />
          <MetricChartStatsRow
            label="TX"
            stats={transmitStats}
            formatter={formatBytesPerSecond}
            accentClassName="bg-blue-600"
          />
        </div>

        {data.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No network data found.
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

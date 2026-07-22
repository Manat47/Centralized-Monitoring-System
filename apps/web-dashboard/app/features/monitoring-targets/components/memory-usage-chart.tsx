"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMemoryUsage } from "../api/use-memory-usage";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

interface MemoryUsageChartProps {
  assetId: string;
}

function formatBytes(value: number): string {
  const gigabytes = value / 1024 / 1024 / 1024;

  return `${gigabytes.toFixed(2)} GB`;
}

export function MemoryUsageChart({ assetId }: MemoryUsageChartProps) {
  const memoryQuery = useMemoryUsage({
    assetId,
    rangeMinutes: 30,
  });

  if (memoryQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading memory chart...
        </CardContent>
      </Card>
    );
  }

  if (memoryQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load memory usage
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {memoryQuery.error instanceof Error
              ? memoryQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = [...(memoryQuery.data ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",

      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];

        const first = items[0];

        if (!first || typeof first.dataIndex !== "number") {
          return "";
        }

        const point = data[first.dataIndex];

        if (!point) {
          return "";
        }

        const timestamp = new Date(point.timestamp).toLocaleString("th-TH");

        return [
          timestamp,
          `Usage: ${point.usagePercent.toFixed(2)}%`,
          `Used: ${formatBytes(point.usedBytes)}`,
          `Available: ${formatBytes(point.availableBytes)}`,
          `Total: ${formatBytes(point.totalBytes)}`,
        ].join("<br/>");
      },
    },

    grid: {
      left: 50,
      right: 24,
      top: 24,
      bottom: 70,
    },

    xAxis: {
      type: "time",
      name: "Time",
      nameLocation: "middle",
      nameGap: 42,
    },

    yAxis: {
      type: "value",
      name: "Memory usage (%)",
      min: 0,
      max: 100,
    },

    dataZoom: [
      {
        type: "inside",
      },
      {
        type: "slider",
        height: 20,
        bottom: 10,
      },
    ],

    series: [
      {
        name: "Memory usage",
        type: "line",
        smooth: true,
        showSymbol: false,

        areaStyle: {},

        data: data.map((point) => [point.timestamp, point.usagePercent]),
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Memory Usage</CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Memory utilization during the last 30 minutes.
          </p>
        </div>

        {memoryQuery.isFetching && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No memory usage data found.
          </div>
        ) : (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{
              height: 360,
              width: "100%",
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

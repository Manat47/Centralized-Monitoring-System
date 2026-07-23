"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useCpuUsage } from "../api/use-cpu-usage";
import type { CpuUsageDataPoint } from "../types/cpu-usage";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

interface CpuUsageChartProps {
  assetId: string;
}

interface CpuAveragePoint {
  timestamp: string;
  usagePercent: number;
}

function calculateAverageByTimestamp(
  points: CpuUsageDataPoint[],
): CpuAveragePoint[] {
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
      usagePercent: Math.round((group.total / group.count) * 100) / 100,
    }))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

export function CpuUsageChart({ assetId }: CpuUsageChartProps) {
  const cpuQuery = useCpuUsage({
    assetId,
    rangeMinutes: 30,
  });

  if (cpuQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading CPU chart...
        </CardContent>
      </Card>
    );
  }

  if (cpuQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load CPU usage
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {cpuQuery.error instanceof Error
              ? cpuQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = calculateAverageByTimestamp(cpuQuery.data ?? []);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${Number(value).toFixed(2)}%`,
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
      name: "CPU usage (%)",
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
        name: "Average CPU usage",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: data.map((point) => [point.timestamp, point.usagePercent]),
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">CPU Usage</CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Average usage across all CPU cores during the last 30 minutes.
          </p>
        </div>

        {cpuQuery.isFetching && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No CPU usage data found.
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

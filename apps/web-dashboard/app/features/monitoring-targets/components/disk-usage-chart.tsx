"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useDiskUsage } from "../api/use-disk-usage";
import type { DiskUsageDataPoint } from "../types/disk-usage";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

interface DiskUsageChartProps {
  assetId: string;
}

function createDiskKey(point: DiskUsageDataPoint): string {
  return `${point.device} (${point.mountpoint})`;
}

function formatBytes(value: number): string {
  const gigabytes = value / 1024 / 1024 / 1024;

  return `${gigabytes.toFixed(2)} GB`;
}

export function DiskUsageChart({ assetId }: DiskUsageChartProps) {
  const diskQuery = useDiskUsage({
    assetId,
    rangeMinutes: 30,
  });

  if (diskQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading disk chart...
        </CardContent>
      </Card>
    );
  }

  if (diskQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load disk usage
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {diskQuery.error instanceof Error
              ? diskQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = [...(diskQuery.data ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const diskKeys = Array.from(new Set(data.map(createDiskKey)));

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];

        const first = items[0];

        if (!first || typeof first.dataIndex !== "number") {
          return "";
        }

        const timestampValue = Array.isArray(first.value)
          ? first.value[0]
          : undefined;

        const timestamp = timestampValue
          ? new Date(String(timestampValue)).toLocaleString("th-TH")
          : "";

        const lines = [timestamp];

        for (const item of items) {
          const diskName = String(item.seriesName);

          const point = data.find(
            (candidate) =>
              createDiskKey(candidate) === diskName &&
              candidate.timestamp ===
                String(Array.isArray(item.value) ? item.value[0] : ""),
          );

          if (!point) {
            continue;
          }

          lines.push(
            `${diskName}: ${point.usagePercent.toFixed(2)}%`,
            `Used: ${formatBytes(point.usedBytes)}`,
            `Available: ${formatBytes(point.availableBytes)}`,
          );
        }

        return lines.join("<br/>");
      },
    },

    legend: {
      type: "scroll",
      top: 0,
    },

    grid: {
      left: 50,
      right: 24,
      top: 60,
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
      name: "Disk usage (%)",
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

    series: diskKeys.map((diskKey) => ({
      name: diskKey,
      type: "line",
      smooth: true,
      showSymbol: false,

      data: data
        .filter((point) => createDiskKey(point) === diskKey)
        .map((point) => [point.timestamp, point.usagePercent]),
    })),
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Disk Usage</CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Disk utilization by device during the last 30 minutes.
          </p>
        </div>

        {diskQuery.isFetching && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No disk usage data found.
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

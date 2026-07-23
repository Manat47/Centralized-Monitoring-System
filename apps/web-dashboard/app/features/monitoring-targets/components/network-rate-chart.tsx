"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useNetworkRate } from "../api/use-network-rate";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
});

interface NetworkRateChartProps {
  assetId: string;
}

function formatBytesPerSecond(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} GB/s`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} MB/s`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)} KB/s`;
  }

  return `${value.toFixed(2)} B/s`;
}

export function NetworkRateChart({ assetId }: NetworkRateChartProps) {
  const networkQuery = useNetworkRate({
    assetId,
    rangeMinutes: 30,
  });

  if (networkQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading network chart...
        </CardContent>
      </Card>
    );
  }

  if (networkQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load network rate
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {networkQuery.error instanceof Error
              ? networkQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = [...(networkQuery.data ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const devices = Array.from(new Set(data.map((point) => point.device)));

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",

      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];

        const first = items[0];

        if (!first) {
          return "";
        }

        const firstValue = Array.isArray(first.value) ? first.value : [];

        const timestamp = firstValue[0]
          ? new Date(String(firstValue[0])).toLocaleString("th-TH")
          : "";

        const lines = [timestamp];

        for (const item of items) {
          const values = Array.isArray(item.value) ? item.value : [];

          const value = Number(values[1]);

          if (Number.isNaN(value)) {
            continue;
          }

          lines.push(
            `${String(item.seriesName)}: ${formatBytesPerSecond(value)}`,
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
      left: 70,
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
      name: "Bytes per second",
      min: 0,
      axisLabel: {
        formatter: (value: number) => formatBytesPerSecond(value),
      },
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

    series: devices.flatMap((device) => {
      const devicePoints = data.filter((point) => point.device === device);

      return [
        {
          name: `${device} RX`,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          data: devicePoints.map((point) => [
            point.timestamp,
            point.receiveBytesPerSecond,
          ]),
        },
        {
          name: `${device} TX`,
          type: "line" as const,
          smooth: true,
          showSymbol: false,
          data: devicePoints.map((point) => [
            point.timestamp,
            point.transmitBytesPerSecond,
          ]),
        },
      ];
    }),
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Network Rate</CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Receive and transmit traffic during the last 30 minutes.
          </p>
        </div>

        {networkQuery.isFetching && (
          <span className="text-xs text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No network data found.
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

"use client";

import { useParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAssets } from "@/app/features/assets/api/use-assets";

import { useMetricsSummary } from "../api/use-metrics-summary";

import { CpuUsageChart } from "./cpu-usage-chart";

import { MemoryUsageChart } from "./memory-usage-chart";

import { DiskUsageChart } from "./disk-usage-chart";

import { NetworkRateChart } from "./network-rate-chart";

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

function formatBytesPerSecond(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} MB/s`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)} KB/s`;
  }

  return `${value.toFixed(2)} B/s`;
}

export function AssetMetricsSummary() {
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId;

  const metricsQuery = useMetricsSummary({
    assetId,
    rangeMinutes: 30,
  });

  const assetsQuery = useAssets();

  const asset = assetsQuery.data?.find((item) => item.assetId === assetId);

  if (metricsQuery.isLoading || assetsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading metrics...
        </CardContent>
      </Card>
    );
  }

  if (metricsQuery.isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">Failed to load metrics</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {metricsQuery.error instanceof Error
              ? metricsQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = metricsQuery.data;

  const primaryDisk = latest?.disks?.[0];
  const primaryNetwork = latest?.networks?.[0];

  const cards = [
    {
      title: "CPU Usage",
      value: formatPercent(latest?.cpu?.averageUsagePercent),
      description: `${latest?.cpu?.cores?.length ?? 0} CPU cores`,
    },
    {
      title: "Memory Usage",
      value: formatPercent(latest?.memory?.usagePercent),
      description: latest?.memory
        ? "Current memory utilization"
        : "No memory data",
    },
    {
      title: "Disk Usage",
      value: formatPercent(primaryDisk?.usagePercent),
      description: primaryDisk
        ? `${primaryDisk.device} mounted at ${primaryDisk.mountpoint}`
        : "No disk data",
    },
    {
      title: "Network Receive",
      value: formatBytesPerSecond(primaryNetwork?.receiveBytesPerSecond),
      description: primaryNetwork
        ? `${primaryNetwork.device} · TX ${formatBytesPerSecond(
            primaryNetwork.transmitBytesPerSecond,
          )}`
        : "No network data",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {asset?.name ?? "Asset Metrics"}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Metrics collected during the last 30 minutes.
          </p>
        </div>

        {metricsQuery.isFetching && (
          <span className="text-sm text-muted-foreground">Updating...</span>
        )}
      </div>

      {!latest ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No metrics found for this time range.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-3xl font-semibold">{card.value}</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CpuUsageChart assetId={assetId} />
            <MemoryUsageChart assetId={assetId} />
            <DiskUsageChart assetId={assetId} />
            <NetworkRateChart assetId={assetId} />
          </div>

          <p className="text-right text-xs text-muted-foreground">
            Latest sample:{" "}
            {latest
              ? new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "medium",
                }).format(new Date(latest.timestamp))
              : "-"}
          </p>
        </>
      )}
    </section>
  );
}

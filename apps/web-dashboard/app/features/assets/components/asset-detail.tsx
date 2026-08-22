"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { useAssets } from "../api/use-assets";
import type { Asset } from "../types/asset";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssetMetricsSummary } from "@/app/features/monitoring-targets/components/asset-metrics-summary";
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";
import { useMetricsSummary } from "@/app/features/monitoring-targets/api/use-metrics-summary";
import { useAlerts } from "@/app/features/alerts/api/use-alerts";
import { AssetHealthOverview } from "./asset-health-overview";
import { AssetAlertsOverview } from "./asset-alerts-overview";

type AssetDetailTab = "overview" | "metrics" | "health" | "alerts";

function formatTargetType(asset: Asset): string {
  switch (asset.targetType) {
    case "SERVER":
      return "Server";

    case "APPLICATION":
      return "Application";

    case "SERVICE":
      return "Service";
  }
}

function formatEnvironment(asset: Asset): string {
  switch (asset.environment) {
    case "PRODUCTION":
      return "Production";

    case "STAGING":
      return "Staging";

    case "DEVELOPMENT":
      return "Development";
  }
}

function formatStatus(asset: Asset): string {
  switch (asset.status) {
    case "ACTIVATE":
      return "Active";

    case "INACTIVATE":
      return "Inactive";

    case "DEACTIVATE":
      return "Deactivated";
  }
}

function getAddress(asset: Asset): string {
  if (asset.targetType === "SERVER") {
    return asset.ipAddress ?? asset.hostname ?? "—";
  }

  return asset.endpoint ?? "—";
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
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

function formatLastCollected(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const tabs: {
  value: AssetDetailTab;
  label: string;
}[] = [
  {
    value: "overview",
    label: "Overview",
  },
  {
    value: "metrics",
    label: "Metrics",
  },
  {
    value: "health",
    label: "Health",
  },
  {
    value: "alerts",
    label: "Alerts",
  },
];

export function AssetDetail() {
  const params = useParams<{ assetId: string }>();

  const assetsQuery = useAssets();

  const [activeTab, setActiveTab] = useState<AssetDetailTab>("overview");

  const asset = (assetsQuery.data ?? []).find(
    (item) => item.assetId === params.assetId,
  );

  if (assetsQuery.isLoading) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading asset...
        </CardContent>
      </Card>
    );
  }

  if (assetsQuery.isError) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-rose-600">
            Failed to load asset
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!asset) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-slate-900">Asset not found</p>

          <Link
            href="/assets"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            Return to assets
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/assets"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" />
          Assets
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          {asset.name}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {formatTargetType(asset)} · {formatEnvironment(asset)}
        </p>
      </div>

      {/* Asset summary */}
      <Card className="border-slate-200 bg-white shadow-none">
        <CardContent className="grid gap-6 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Type">{formatTargetType(asset)}</SummaryItem>

          <SummaryItem label="Environment">
            {formatEnvironment(asset)}
          </SummaryItem>

          <SummaryItem
            label={asset.targetType === "SERVER" ? "IP Address" : "Endpoint"}
          >
            <span className="font-mono text-xs">{getAddress(asset)}</span>
          </SummaryItem>

          <SummaryItem label="Hostname">{asset.hostname ?? "—"}</SummaryItem>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={
              activeTab === tab.value
                ? "rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm"
                : "rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <AssetOverview asset={asset} />}

      {activeTab === "metrics" && <AssetMetricsSummary />}

      {activeTab === "health" && (
        <AssetHealthOverview assetId={asset.assetId} />
      )}

      {activeTab === "alerts" && (
        <AssetAlertsOverview assetId={asset.assetId} />
      )}
    </section>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">{label}</p>

      <div className="text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

function AssetOverview({ asset }: { asset: Asset }) {
  const targetsQuery = useMonitoringTargets();

  const metricsQuery = useMetricsSummary({
    assetId: asset.assetId,
    rangeMinutes: 30,
  });

  const triggeredAlertsQuery = useAlerts({
    assetId: asset.assetId,
    status: "TRIGGERED",
    page: 1,
    limit: 1,
  });

  const acknowledgedAlertsQuery = useAlerts({
    assetId: asset.assetId,
    status: "ACKNOWLEDGED",
    page: 1,
    limit: 1,
  });

  const assetTargets = (targetsQuery.data ?? []).filter(
    (target) => target.assetId === asset.assetId,
  );

  const monitoringTarget =
    assetTargets.find((target) => target.monitoringEnabled) ?? assetTargets[0];

  const metrics = metricsQuery.data;

  const activeAlerts =
    (triggeredAlertsQuery.data?.total ?? 0) +
    (acknowledgedAlertsQuery.data?.total ?? 0);

  const diskUsageValues =
    metrics?.disks
      ?.map((disk) => disk.usagePercent)
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      ) ?? [];

  const maxDiskUsage =
    diskUsageValues.length > 0 ? Math.max(...diskUsageValues) : null;

  const networkReceive =
    metrics?.networks && metrics.networks.length > 0
      ? metrics.networks.reduce(
          (total, network) => total + (network.receiveBytesPerSecond ?? 0),
          0,
        )
      : null;

  const hasRecentMetrics =
    metrics?.cpu.averageUsagePercent != null ||
    metrics?.memory?.usagePercent != null ||
    (metrics?.disks?.length ?? 0) > 0 ||
    (metrics?.networks?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Operational Status */}
      <Card className="border-slate-200 bg-white shadow-none">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Operational Status
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Current operational state for this asset
          </p>
        </div>

        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <OverviewStatus
            label="Asset status"
            value={formatStatus(asset)}
            tone={asset.status === "ACTIVATE" ? "success" : "neutral"}
          />

          <OverviewStatus
            label="Monitoring target"
            value={
              !monitoringTarget
                ? "Not configured"
                : monitoringTarget.monitoringEnabled
                  ? "Enabled"
                  : "Disabled"
            }
            tone={monitoringTarget?.monitoringEnabled ? "info" : "neutral"}
          />

          <OverviewStatus
            label="Verification"
            value={
              monitoringTarget
                ? monitoringTarget.verificationStatus
                    .toLowerCase()
                    .replaceAll("_", " ")
                : "No target"
            }
            tone={
              monitoringTarget?.verificationStatus === "VERIFIED"
                ? "success"
                : monitoringTarget?.verificationStatus === "FAILED"
                  ? "danger"
                  : "neutral"
            }
          />

          <OverviewStatus
            label="Active alerts"
            value={String(activeAlerts)}
            tone={activeAlerts > 0 ? "danger" : "success"}
          />
        </CardContent>
      </Card>

      {/* Latest metrics */}
      <Card className="border-slate-200 bg-white shadow-none">
        <div className="border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Latest Resource Values
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Most recent infrastructure metrics
            </p>
          </div>
        </div>

        {metricsQuery.isLoading ? (
          <CardContent className="py-10 text-center">
            <p className="text-sm text-slate-500">Loading recent metrics...</p>
          </CardContent>
        ) : !hasRecentMetrics ? (
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No recent metrics
            </p>

            <p className="mt-1 text-xs text-slate-500">
              No metrics were collected in the last 30 minutes.
            </p>

            {monitoringTarget?.lastCollectedAt && (
              <p className="mt-2 text-[11px] text-slate-400">
                Last collected{" "}
                {formatLastCollected(monitoringTarget.lastCollectedAt)}
              </p>
            )}
          </CardContent>
        ) : (
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricValue
              label="CPU"
              value={formatPercent(metrics?.cpu.averageUsagePercent)}
            />

            <MetricValue
              label="Memory"
              value={formatPercent(metrics?.memory?.usagePercent)}
            />

            <MetricValue
              label="Disk (max)"
              value={formatPercent(maxDiskUsage)}
            />

            <MetricValue
              label="Network RX"
              value={formatBytesPerSecond(networkReceive)}
            />
          </CardContent>
        )}
      </Card>

      {/* Asset Information */}
      <Card className="border-slate-200 bg-white shadow-none">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Asset Information
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Registered resource information
          </p>
        </div>

        <CardContent className="grid gap-x-10 gap-y-6 p-5 md:grid-cols-2 xl:grid-cols-3">
          <SummaryItem label="Asset name">{asset.name}</SummaryItem>

          <SummaryItem label="Hostname">{asset.hostname ?? "—"}</SummaryItem>

          <SummaryItem label="Target type">
            {formatTargetType(asset)}
          </SummaryItem>

          <SummaryItem label="Environment">
            {formatEnvironment(asset)}
          </SummaryItem>

          <SummaryItem
            label={asset.targetType === "SERVER" ? "IP address" : "Endpoint"}
          >
            {getAddress(asset)}
          </SummaryItem>

          <SummaryItem label="Monitoring">
            {asset.monitoringEnable ? "Enabled" : "Disabled"}
          </SummaryItem>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "info" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "text-emerald-600",
    info: "text-blue-600",
    danger: "text-rose-600",
    neutral: "text-slate-600",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>

      <p className={`mt-2 text-sm font-semibold capitalize ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

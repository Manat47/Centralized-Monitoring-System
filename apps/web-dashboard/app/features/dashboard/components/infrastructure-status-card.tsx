"use client";

import Link from "next/link";
import { Activity, Bell, HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  AssetOverallStatus,
  DashboardAssetOverview,
} from "../types/dashboard-summary";

const statusStyles: Record<
  AssetOverallStatus,
  { label: string; border: string; badge: string; dot: string }
> = {
  OK: {
    label: "OK",
    border: "border-l-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  WARNING: {
    label: "Warning",
    border: "border-l-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  CRITICAL: {
    label: "Critical",
    border: "border-l-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  NO_DATA: {
    label: "No data",
    border: "border-l-slate-400",
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  NOT_MONITORED: {
    label: "Not monitored",
    border: "border-l-slate-300",
    badge: "border-slate-200 bg-white text-slate-500",
    dot: "bg-slate-300",
  },
  INACTIVE: {
    label: "Inactive",
    border: "border-l-slate-300",
    badge: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-300",
  },
};

function formatTargetType(value: DashboardAssetOverview["targetType"]): string {
  return value === "SERVER" ? "Server" : "Application";
}

function formatEnvironment(
  value: DashboardAssetOverview["environment"],
): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatRelativeTime(value: string): string {
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86_400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86_400)}d ago`;
}

function formatTelemetryStatus(
  status: NonNullable<DashboardAssetOverview["telemetry"]>["status"],
): string {
  switch (status) {
    case "FRESH":
      return "Fresh";
    case "STALE":
      return "Stale";
    case "FAILED":
      return "Failed";
    case "NO_DATA":
      return "No data";
    case "PAUSED":
      return "Paused";
    case "NOT_CONFIGURED":
      return "Not configured";
  }
}

function formatHealthStatus(
  status: NonNullable<DashboardAssetOverview["healthChecks"]>["status"],
): string {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "UNAVAILABLE":
      return "Unavailable";
    case "STALE":
      return "Stale";
    case "UNKNOWN":
      return "Unknown";
    case "PAUSED":
      return "Paused";
    case "NOT_CONFIGURED":
      return "Not configured";
  }
}

function MetricBar({ label, value }: { label: string; value: number | null }) {
  const normalized = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  const barClass =
    normalized >= 90
      ? "bg-rose-500"
      : normalized >= 80
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums text-slate-700">
          {value === null ? "No data" : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", value !== null && barClass)}
          style={{ width: value === null ? "0%" : `${normalized}%` }}
        />
      </div>
    </div>
  );
}

export function InfrastructureStatusCard({
  asset,
}: {
  asset: DashboardAssetOverview;
}) {
  const status = statusStyles[asset.overallStatus];
  const alertText =
    asset.alerts.active === 0
      ? "0"
      : asset.alerts.critical > 0
        ? `${asset.alerts.critical} Critical`
        : `${asset.alerts.warning} Warning`;

  return (
    <Link
      href={`/assets/${asset.assetId}`}
      aria-label={`View ${asset.name}`}
      className={cn(
        "group flex min-h-52 flex-col border border-l-2 border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        status.border,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {asset.name}
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-500">
            {formatTargetType(asset.targetType)} /{" "}
            {formatEnvironment(asset.environment)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium",
            status.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      <p
        title={asset.statusReason}
        className="mt-3 min-h-8 line-clamp-2 text-xs leading-4 text-slate-600"
      >
        {asset.statusReason}
      </p>

      <div className="mt-3 space-y-2 border-y border-slate-100 py-3 text-xs">
        {asset.telemetry && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-500">
              <Activity className="size-3.5" /> Monitoring
            </span>
            <span className="font-medium text-slate-700">
              {formatTelemetryStatus(asset.telemetry.status)}
            </span>
          </div>
        )}

        {asset.healthChecks && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-500">
              <HeartPulse className="size-3.5" /> Health checks
            </span>
            <span className="font-medium text-slate-700">
              {asset.healthChecks.status === "AVAILABLE"
                ? `${asset.healthChecks.available}/${asset.healthChecks.total} Available`
                : formatHealthStatus(asset.healthChecks.status)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-slate-500">
            <Bell className="size-3.5" /> Active alerts
          </span>
          <span
            className={cn(
              "font-medium",
              asset.alerts.critical > 0
                ? "text-rose-700"
                : asset.alerts.warning > 0
                  ? "text-amber-700"
                  : "text-slate-700",
            )}
          >
            {alertText}
          </span>
        </div>
      </div>

      {asset.metrics ? (
        <div className="mt-3 flex gap-4">
          <MetricBar label="CPU" value={asset.metrics.cpuUsagePercent} />
          <MetricBar label="Memory" value={asset.metrics.memoryUsagePercent} />
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Response</span>
          <span className="font-medium tabular-nums text-slate-700">
            {asset.healthChecks?.responseTimeMs == null
              ? "No data"
              : `${asset.healthChecks.responseTimeMs} ms`}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[10px] text-slate-400">
        <span className="truncate" title={asset.address ?? undefined}>
          {asset.address ?? "No address"}
        </span>
        <span className="shrink-0">
          Updated {formatRelativeTime(asset.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

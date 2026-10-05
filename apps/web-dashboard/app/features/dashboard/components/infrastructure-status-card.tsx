"use client";

import Link from "next/link";
import { Activity, Bell, HeartPulse } from "lucide-react";

import { cn } from "@/lib/utils";

import type { AssetOverallStatus, DashboardAssetOverview } from "../types/dashboard-summary";

const statusStyles: Record<AssetOverallStatus, { label: string; border: string; badge: string }> = {
  OK: { label: "OK", border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  WARNING: { label: "Warning", border: "border-l-amber-500", badge: "bg-amber-50 text-amber-700" },
  CRITICAL: { label: "Critical", border: "border-l-rose-500", badge: "bg-rose-50 text-rose-700" },
  NO_DATA: { label: "No data", border: "border-l-slate-400", badge: "bg-slate-100 text-slate-600" },
  NOT_MONITORED: { label: "Not monitored", border: "border-l-slate-300", badge: "bg-slate-100 text-slate-600" },
  INACTIVE: { label: "Inactive", border: "border-l-slate-300", badge: "bg-slate-100 text-slate-600" },
};

function elapsedLabel(timestamp: string | null): string {
  if (!timestamp) return "No sample yet";
  const seconds = Math.floor((Date.now() - Date.parse(timestamp)) / 1000);
  if (!Number.isFinite(seconds)) return "Unknown sample time";
  if (seconds < 60) return "Last seen <1m ago";
  if (seconds < 3600) return `Last seen ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `Last seen ${Math.floor(seconds / 3600)}h ago`;
  return `Last seen ${Math.floor(seconds / 86_400)}d ago`;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function InfrastructureStatusCard({ asset }: { asset: DashboardAssetOverview }) {
  const style = statusStyles[asset.overallStatus];
  const metricsFresh = asset.metrics?.fresh ?? false;
  const hasMetricValues = asset.metrics?.cpuUsagePercent != null || asset.metrics?.memoryUsagePercent != null;
  const healthFresh = asset.healthChecks?.status === "AVAILABLE" || asset.healthChecks?.status === "UNAVAILABLE";

  return (
    <Link
      href={`/assets/${asset.assetId}`}
      aria-label={`View ${asset.name}`}
      className={cn(
        "group block rounded-lg border border-l-[3px] border-slate-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        style.border,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{asset.name}</p>
          <p className="truncate text-[11px] text-slate-500">{asset.environment.toLowerCase()} · {asset.targetType.toLowerCase()}</p>
        </div>
        <span className={cn("shrink-0 rounded px-2 py-0.5 text-[10px] font-medium", style.badge)}>{style.label}</span>
      </div>

      <p className="mt-2 truncate text-xs text-slate-600" title={asset.statusReason}>{asset.statusReason}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px]">
        {asset.metrics ? (
          <>
            <span className="inline-flex items-center gap-1 text-slate-600"><Activity className="size-3" /> CPU <strong className="font-semibold text-slate-900">{metricsFresh ? percent(asset.metrics.cpuUsagePercent) : "—"}</strong></span>
            <span className="text-slate-600">Memory <strong className="font-semibold text-slate-900">{metricsFresh ? percent(asset.metrics.memoryUsagePercent) : "—"}</strong></span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-600"><HeartPulse className="size-3" /> Latency <strong className="font-semibold text-slate-900">{healthFresh && asset.healthChecks?.responseTimeMs != null ? `${asset.healthChecks.responseTimeMs} ms` : "—"}</strong></span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-slate-600"><Bell className="size-3" /> {asset.alerts.active} alert{asset.alerts.active === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="truncate" title={asset.address ?? undefined}>{asset.address ?? "No address"}</span>
        {asset.metrics && (!metricsFresh || !hasMetricValues) && <span className="shrink-0">{elapsedLabel(asset.metrics.timestamp)}</span>}
        {!asset.metrics && !healthFresh && asset.healthChecks && <span className="shrink-0">{elapsedLabel(asset.healthChecks.lastCheckedAt)}</span>}
      </div>
    </Link>
  );
}

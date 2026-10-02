"use client";

import { useState } from "react";

import { useDashboardSummary } from "@/app/features/dashboard/api/use-dashboard-summary";
import type { AssetOverallStatus } from "@/app/features/dashboard/types/dashboard-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AssetMetricsSummary } from "./asset-metrics-summary";

const statusStyle: Record<AssetOverallStatus, string> = {
  OK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-700",
  NO_DATA: "border-slate-200 bg-slate-100 text-slate-600",
  NOT_MONITORED: "border-slate-200 bg-slate-100 text-slate-600",
  INACTIVE: "border-slate-200 bg-slate-100 text-slate-600",
};

export function InfrastructureMetricsOverview() {
  const summary = useDashboardSummary();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [hostSearch, setHostSearch] = useState("");
  const assets = summary.data?.assetOverview.filter((asset) => asset.targetType === "SERVER") ?? [];
  const selectedAsset = assets.find((asset) => asset.assetId === selectedAssetId) ?? assets[0];
  const normalizedSearch = hostSearch.trim().toLowerCase();
  const visibleAssets = assets.filter((asset) =>
    !normalizedSearch || asset.name.toLowerCase().includes(normalizedSearch) ||
    (asset.address ?? "").toLowerCase().includes(normalizedSearch),
  );

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Asset Inventory &amp; Performance Metrics</CardTitle>
        <p className="text-xs text-slate-500">Select a host on the left to inspect its CPU, memory, disk, and network history.</p>
      </CardHeader>
      <CardContent>
        {summary.isLoading ? <p className="text-sm text-slate-500">Loading hosts...</p> : summary.isError ? <p className="text-sm text-rose-600">Host summary is unavailable.</p> : assets.length === 0 ? <p className="text-sm text-slate-500">No server assets found.</p> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(240px,3fr)_minmax(0,7fr)]">
            <section aria-label="Asset inventory" className="min-w-0 rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 p-3">
                <label htmlFor="host-search" className="mb-2 block text-xs font-semibold text-slate-700">Hosts ({assets.length})</label>
                <Input id="host-search" value={hostSearch} onChange={(event) => setHostSearch(event.target.value)} placeholder="Search hosts" aria-label="Search hosts" />
              </div>
              <div className="max-h-[32rem] overflow-y-auto p-2">
                {visibleAssets.length === 0 ? <p className="p-3 text-sm text-slate-500">No hosts match this search.</p> : visibleAssets.map((asset) => (
                  <button
                    key={asset.assetId}
                    type="button"
                    aria-pressed={selectedAsset?.assetId === asset.assetId}
                    onClick={() => setSelectedAssetId(asset.assetId)}
                    className={cn(
                      "mb-1 flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      selectedAsset?.assetId === asset.assetId ? "border-blue-300 bg-blue-50" : "border-transparent hover:bg-slate-50",
                    )}
                  >
                    <span className="flex w-full items-start justify-between gap-2">
                      <span className="min-w-0 truncate font-medium text-slate-900" title={asset.name}>{asset.name}</span>
                      <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusStyle[asset.overallStatus])}>{asset.overallStatus.replaceAll("_", " ")}</Badge>
                    </span>
                    <span className="max-w-full truncate text-xs text-slate-500" title={asset.address ?? undefined}>{asset.address ?? "No address"}</span>
                  </button>
                ))}
              </div>
            </section>
            <section aria-label="Performance metrics" className="min-w-0 rounded-lg border border-slate-200 p-4">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">{selectedAsset.name} · Performance metrics</h3>
              <AssetMetricsSummary assetId={selectedAsset.assetId} />
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

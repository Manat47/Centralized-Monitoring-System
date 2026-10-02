"use client";

import { useState } from "react";

import { useDashboardSummary } from "@/app/features/dashboard/api/use-dashboard-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetMetricsSummary } from "./asset-metrics-summary";

export function InfrastructureMetricsOverview() {
  const summary = useDashboardSummary();
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const assets = summary.data?.assetOverview.filter((asset) => asset.metrics) ?? [];

  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Latest performance metrics</CardTitle>
        <p className="text-xs text-slate-500">Select an asset to inspect CPU, memory, disk, and network history here.</p>
      </CardHeader>
      <CardContent>
        {summary.isLoading ? <p className="text-sm text-slate-500">Loading metrics...</p> : summary.isError ? <p className="text-sm text-rose-600">Metrics summary is unavailable.</p> : assets.length === 0 ? <p className="text-sm text-slate-500">No collected metrics yet.</p> : (
          <div className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <div key={asset.assetId} className="flex flex-wrap items-center gap-4 py-3 text-sm">
                <span className="min-w-36 flex-1 font-medium">{asset.name}</span>
                <span>CPU: {asset.metrics?.cpuUsagePercent == null ? "—" : `${asset.metrics.cpuUsagePercent.toFixed(1)}%`}</span>
                <span>Memory: {asset.metrics?.memoryUsagePercent == null ? "—" : `${asset.metrics.memoryUsagePercent.toFixed(1)}%`}</span>
                <button type="button" onClick={() => setSelectedAssetId(asset.assetId)} className="text-blue-700 hover:underline">View metrics</button>
              </div>
            ))}
          </div>
        )}
        {selectedAssetId && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-sm font-semibold">{assets.find((asset) => asset.assetId === selectedAssetId)?.name} metrics</h3>
            <AssetMetricsSummary assetId={selectedAssetId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

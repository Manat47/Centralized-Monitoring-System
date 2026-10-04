"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, Server } from "lucide-react";

import type { Asset } from "@/app/features/assets/types/asset";
import { EditAssetDialog } from "@/app/features/assets/components/edit-asset-dialog";
import { getHealthCheckHistory } from "@/app/features/health-checks/api/get-health-check-detail";
import { CreateHealthCheckDialog } from "@/app/features/health-checks/components/create-health-check-dialog";
import { getHealthResultStatus } from "@/app/features/health-checks/components/health-check-status";
import type { HealthCheckTarget } from "@/app/features/health-checks/types/health-check";
import { useMetricRules } from "@/app/features/metric-rules/api/use-metric-rules";
import type { MetricRuleType } from "@/app/features/metric-rules/types/metric-rule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CpuUsageChart } from "./cpu-usage-chart";
import { DiskUsageChart } from "./disk-usage-chart";
import { MemoryUsageChart } from "./memory-usage-chart";
import { NetworkRateChart } from "./network-rate-chart";
import type { MetricThreshold } from "./metric-chart-utils";
import { CopyIpButton } from "./copy-ip-button";

const ranges = [
  { value: "15", label: "Last 15 minutes" },
  { value: "60", label: "Last 1 hour" },
  { value: "1440", label: "Last 24 hours" },
] as const;

interface HostInspectionDrawerProps {
  asset: Asset | null;
  healthChecks: HealthCheckTarget[];
  hasMetricTarget: boolean;
  onClose: () => void;
}

export function HostInspectionDrawer({ asset, healthChecks, hasMetricTarget, onClose }: HostInspectionDrawerProps) {
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {asset && <DialogContent
        className="top-0 right-0 left-auto block h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l border-slate-200 bg-slate-50 p-0 shadow-2xl data-open:slide-in-from-right data-closed:slide-out-to-right sm:max-w-[min(900px,90vw)] lg:max-w-[60vw]"
      >
        <HostInspectionContent asset={asset} healthChecks={healthChecks} hasMetricTarget={hasMetricTarget} />
      </DialogContent>}
    </Dialog>
  );
}

function HostInspectionContent({ asset, healthChecks, hasMetricTarget }: Omit<HostInspectionDrawerProps, "onClose"> & { asset: Asset }) {
  const [rangeMinutes, setRangeMinutes] = useState("60");
  const [selectedTab, setSelectedTab] = useState<"performance" | "health" | null>(null);
  const tab = selectedTab ?? (asset.targetType === "SERVER" && hasMetricTarget ? "performance" : "health");
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const metricRules = useMetricRules();
  const activeHealthChecks = healthChecks.filter((target) => !target.archivedAt);

  const thresholds = (metricType: MetricRuleType): MetricThreshold[] =>
    (metricRules.data ?? [])
      .filter((rule) => rule.assetId === asset.assetId && rule.metricType === metricType && rule.enabled)
      .map((rule) => ({ id: rule.ruleId, value: rule.thresholdValue, severity: rule.severity }));

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cpu-usage", asset.assetId] }),
        queryClient.invalidateQueries({ queryKey: ["memory-usage", asset.assetId] }),
        queryClient.invalidateQueries({ queryKey: ["disk-usage", asset.assetId] }),
        queryClient.invalidateQueries({ queryKey: ["network-rate", asset.assetId] }),
        queryClient.invalidateQueries({ queryKey: ["metrics-summary", asset.assetId] }),
        queryClient.invalidateQueries({ queryKey: ["health-check-targets"] }),
        queryClient.invalidateQueries({ queryKey: ["health-check-history"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  return <>
    <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5 pr-14">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><Server className="size-5" /></div>
        <div>
          <DialogTitle className="text-xl">{asset.name}</DialogTitle>
          <DialogDescription className="mt-1 flex flex-wrap items-center gap-1">
            {asset.ipAddress ?? asset.hostname ?? asset.endpoint ?? "No address"}
            {asset.ipAddress && <CopyIpButton ipAddress={asset.ipAddress} />}
            <span aria-hidden="true">·</span> {asset.targetType}
          </DialogDescription>
        </div>
        <Badge variant="outline" className="ml-auto">{asset.status === "ACTIVATE" ? "Active" : asset.status === "INACTIVATE" ? "Inactive" : "Deactivated"}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-4">
        <Select value={rangeMinutes} onValueChange={(value) => { if (value) setRangeMinutes(value); }}>
          <SelectTrigger aria-label="Time range" className="w-44 bg-white"><SelectValue>{ranges.find((range) => range.value === rangeMinutes)?.label}</SelectValue></SelectTrigger>
          <SelectContent>{ranges.map((range) => <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={() => void refresh()}><RefreshCw className="size-4" />{refreshing ? "Refreshing" : "Refresh"}</Button>
      </div>
    </DialogHeader>

    <div className="px-6 pt-5">
      <div role="tablist" aria-label="Host inspection" className="flex gap-1 border-b border-slate-200">
        <Button type="button" role="tab" aria-selected={tab === "performance"} variant="ghost" className={tab === "performance" ? "rounded-none border-b-2 border-blue-600 text-blue-700" : "rounded-none text-slate-500"} onClick={() => setSelectedTab("performance")}>Performance</Button>
        <Button type="button" role="tab" aria-selected={tab === "health"} variant="ghost" className={tab === "health" ? "rounded-none border-b-2 border-blue-600 text-blue-700" : "rounded-none text-slate-500"} onClick={() => setSelectedTab("health")}>Health Checks ({activeHealthChecks.length})</Button>
      </div>
      {tab === "health" && (
        <Link className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline" href={`/monitoring/targets?search=${encodeURIComponent(asset.name)}`}>
          View monitoring targets for {asset.name}
        </Link>
      )}
    </div>

    <div className="space-y-4 px-6 py-5">
      {tab === "performance" ? hasMetricTarget ? <>
        <CpuUsageChart assetId={asset.assetId} rangeMinutes={Number(rangeMinutes)} thresholds={thresholds("CPU_USAGE")} />
        <MemoryUsageChart assetId={asset.assetId} rangeMinutes={Number(rangeMinutes)} thresholds={thresholds("MEMORY_USAGE")} />
        <DiskUsageChart assetId={asset.assetId} rangeMinutes={Number(rangeMinutes)} thresholds={thresholds("DISK_USAGE")} />
        <NetworkRateChart assetId={asset.assetId} rangeMinutes={Number(rangeMinutes)} />
      </> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Activity className="mx-auto mb-3 size-6 text-slate-400" /><p className="font-medium text-slate-800">No metric data available</p><p className="mt-1 text-sm text-slate-500">This host has no active monitoring target. Historical charts will appear when collection is enabled.</p></div> :
        activeHealthChecks.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">No health checks are linked to this asset.</div> :
        activeHealthChecks.map((target) => <HealthCheckHistoryCard key={target.healthCheckTargetId} target={target} rangeMinutes={Number(rangeMinutes)} />)}
    </div>

    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-6 py-4">
      <EditAssetDialog asset={asset} />
      {asset.targetType === "APPLICATION" && asset.status !== "DEACTIVATE" ? <CreateHealthCheckDialog initialAssetId={asset.assetId} buttonLabel="Add Health Target" /> : <Button variant="outline" disabled title="Health checks require a non-deactivated application asset">Add Health Target</Button>}
      <Button variant="ghost" render={<Link href={`/assets/${asset.assetId}`} />}>View asset details</Button>
    </div>
  </>;
}

function HealthCheckHistoryCard({ target, rangeMinutes }: { target: HealthCheckTarget; rangeMinutes: number }) {
  const query = useQuery({
    queryKey: ["health-check-history", target.healthCheckTargetId, rangeMinutes],
    queryFn: () => { const end = new Date(); return getHealthCheckHistory(target.healthCheckTargetId, new Date(end.getTime() - rangeMinutes * 60_000), end); },
    refetchInterval: 30_000,
  });
  const history = [...(query.data ?? [])].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const average = history.length ? Math.round(history.reduce((sum, point) => sum + point.responseTimeMs, 0) / history.length) : null;
  const status = getHealthResultStatus(target);

  return <section className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-medium text-slate-900">{target.url}</h3><p className="mt-1 text-xs text-slate-500">{target.enabled ? status : "Paused"} · Average response: {average === null ? "—" : `${average} ms`}</p></div><Button size="sm" variant="outline" render={<Link href={`/health-checks/${target.healthCheckTargetId}`} />}>Details</Button></div>
    {query.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading history...</p> : query.isError ? <p className="mt-4 text-sm text-rose-600">Could not load health history.</p> : history.length === 0 ? <p className="mt-4 text-sm text-slate-500">No checks in this time range.</p> :
      <ul className="mt-4 divide-y divide-slate-100 text-sm">{history.slice(0, 10).map((point, index) => <li key={`${point.timestamp}-${index}`} className="flex justify-between gap-3 py-2"><span className="text-slate-600">{new Date(point.timestamp).toLocaleString()}</span><span className={point.error || point.statusCode === null || point.statusCode >= 400 ? "text-rose-600" : "text-emerald-700"}>{point.error ? "Failed" : `HTTP ${point.statusCode}`} · {point.responseTimeMs} ms</span></li>)}</ul>}
  </section>;
}

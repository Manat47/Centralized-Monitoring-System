"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, Globe, Search, Server } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { AssetActions } from "@/app/features/assets/components/asset-actions";
import { CreateAssetDialog } from "@/app/features/assets/components/create-asset-dialog";
import type { Asset } from "@/app/features/assets/types/asset";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import { useDashboardSummary } from "@/app/features/dashboard/api/use-dashboard-summary";
import type { AssetOverallStatus } from "@/app/features/dashboard/types/dashboard-summary";
import { getHealthResultStatus } from "@/app/features/health-checks/components/health-check-status";
import type { HealthCheckTarget } from "@/app/features/health-checks/types/health-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getMetricsSummary } from "../api/get-metrics-summary";
import { useMonitoringTargets } from "../api/use-monitoring-targets";
import { CopyIpButton } from "./copy-ip-button";
import { HostInspectionDrawer } from "./host-inspection-drawer";

type StatusFilter = "ALL" | "ACTIVATE" | "INACTIVATE" | "DEACTIVATE";
type TypeFilter = "ALL" | "SERVER" | "APPLICATION";
type SortOrder = "HEALTH" | "NAME_ASC" | "NAME_DESC" | "SERVER_FIRST" | "APP_FIRST";
const overallStatuses: AssetOverallStatus[] = ["OK", "WARNING", "CRITICAL", "NO_DATA", "NOT_MONITORED", "INACTIVE"];
const overallBadges: Record<AssetOverallStatus, { label: string; className: string }> = {
  OK: { label: "OK", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  WARNING: { label: "Warning", className: "border-amber-200 bg-amber-50 text-amber-700" },
  CRITICAL: { label: "Critical", className: "border-rose-200 bg-rose-50 text-rose-700" },
  NO_DATA: { label: "No data", className: "border-slate-200 bg-slate-100 text-slate-600" },
  NOT_MONITORED: { label: "Not monitored", className: "border-slate-200 bg-slate-100 text-slate-600" },
  INACTIVE: { label: "Inactive", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

function statusFor(asset: Asset, checks: HealthCheckTarget[]) {
  if (asset.status === "DEACTIVATE") return { label: "Deactivated", className: "border-slate-200 bg-slate-100 text-slate-600" };
  if (asset.status === "INACTIVATE") return { label: "Inactive", className: "border-slate-200 bg-slate-100 text-slate-600" };
  const activeChecks = checks.filter((check) => check.enabled && !check.archivedAt);
  if (activeChecks.some((check) => getHealthResultStatus(check) === "UNAVAILABLE")) return { label: "Warning", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (activeChecks.some((check) => getHealthResultStatus(check) === "STALE")) return { label: "Stale", className: "border-slate-200 bg-slate-100 text-slate-600" };
  return { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function latestCheck(checks: HealthCheckTarget[]): HealthCheckTarget | undefined {
  return checks.filter((check) => !check.archivedAt).sort((a, b) => Date.parse(b.latest?.timestamp ?? b.lastCheckedAt ?? "0") - Date.parse(a.latest?.timestamp ?? a.lastCheckedAt ?? "0"))[0];
}

function healthRank(asset: Asset, checks: HealthCheckTarget[]): number {
  switch (statusFor(asset, checks).label) {
    case "Warning": return 0;
    case "Stale": return 1;
    case "Active": return 2;
    case "Inactive": return 3;
    default: return 4;
  }
}

function typeRank(asset: Asset, order: "SERVER_FIRST" | "APP_FIRST"): number {
  if (asset.targetType === "SERVICE") return 2;
  if (order === "SERVER_FIRST") return asset.targetType === "SERVER" ? 0 : 1;
  return asset.targetType === "APPLICATION" ? 0 : 1;
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : "—";
}

function ResourceSnapshot({ assetId, enabled }: { assetId: string; enabled: boolean }) {
  const query = useQuery({
    queryKey: ["metrics-summary", assetId, 15],
    queryFn: () => { const end = new Date(); return getMetricsSummary({ assetId, start: new Date(end.getTime() - 15 * 60_000).toISOString(), end: end.toISOString() }); },
    enabled,
    refetchInterval: 60_000,
  });
  if (!enabled) return <span className="text-slate-400" aria-label="No active metrics">—</span>;
  if (query.isLoading) return <span className="text-slate-400">Loading...</span>;
  if (query.isError) return <span className="text-rose-600">Unavailable</span>;
  if (query.data?.cpu.averageUsagePercent == null && query.data?.memory?.usagePercent == null) {
    return <span className="text-slate-400" aria-label="No metric data">—</span>;
  }
  return <span className="whitespace-nowrap">CPU {formatPercent(query.data?.cpu.averageUsagePercent)} <span className="text-slate-300">/</span> Mem {formatPercent(query.data?.memory?.usagePercent)}</span>;
}

export function InfrastructureConsole() {
  const searchParams = useSearchParams();
  const selectedHostId = searchParams.get("inspectHost");
  const overallParam = searchParams.get("overall");
  const overallFilter = overallParam?.split(",").filter(
    (value): value is AssetOverallStatus => overallStatuses.includes(value as AssetOverallStatus),
  ) ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const typeParam = searchParams.get("type");
  const typeFilter: TypeFilter = typeParam === "SERVER" || typeParam === "APPLICATION" ? typeParam : "ALL";
  const [sortOrder, setSortOrder] = useState<SortOrder>("HEALTH");
  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();
  const healthQuery = useHealthCheckTargets();
  const overviewQuery = useDashboardSummary(overallFilter.length > 0);
  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const healthTargets = healthQuery.data ?? [];
  const healthByAsset = useMemo(() => {
    const grouped = new Map<string, HealthCheckTarget[]>();
    for (const target of healthQuery.data ?? []) {
      if (!target.assetId) continue;
      const checks = grouped.get(target.assetId) ?? [];
      checks.push(target);
      grouped.set(target.assetId, checks);
    }
    return grouped;
  }, [healthQuery.data]);
  const metricAssetIds = useMemo(() => new Set(
    (targetsQuery.data ?? [])
      .filter((target) => target.monitoringType === "NODE_EXPORTER" && !target.archivedAt && target.monitoringEnabled)
      .map((target) => target.assetId),
  ), [targetsQuery.data]);
  const selectedAsset = assets.find((asset) => asset.assetId === selectedHostId) ?? null;
  const overviewByAsset = new Map(
    (overviewQuery.data?.assetOverview ?? []).map((item) => [item.assetId, item.overallStatus]),
  );
  const filteredAssets = (() => {
    const term = search.trim().toLowerCase();
    const selectedStatuses = new Set(overallFilter);
    return assets.filter((asset) => {
      const overallStatus = overviewByAsset.get(asset.assetId);
      return (typeFilter === "ALL" || asset.targetType === typeFilter) &&
        (statusFilter === "ALL" || asset.status === statusFilter) &&
        (selectedStatuses.size === 0 || (overallStatus !== undefined && selectedStatuses.has(overallStatus))) &&
        (!term || [asset.name, asset.hostname, asset.ipAddress, asset.endpoint].some((value) => value?.toLowerCase().includes(term)));
    }).sort((a, b) => {
      const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      const byId = a.assetId.localeCompare(b.assetId);
      if (sortOrder === "HEALTH") return healthRank(a, healthByAsset.get(a.assetId) ?? []) - healthRank(b, healthByAsset.get(b.assetId) ?? []) || byName || byId;
      if (sortOrder === "NAME_ASC") return byName || byId;
      if (sortOrder === "NAME_DESC") return -byName || byId;
      return typeRank(a, sortOrder) - typeRank(b, sortOrder) || byName || byId;
    });
  })();

  function inspect(assetId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (assetId) params.set("inspectHost", assetId);
    else params.delete("inspectHost");
    window.history.replaceState(null, "", `/infrastructure${params.size ? `?${params.toString()}` : ""}`);
  }

  function clearOverallFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("overall");
    window.history.replaceState(null, "", `/infrastructure${params.size ? `?${params.toString()}` : ""}`);
  }

  function setTypeFilter(value: TypeFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") params.delete("type");
    else params.set("type", value);
    window.history.replaceState(null, "", `/infrastructure${params.size ? `?${params.toString()}` : ""}`);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, assetId: string) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inspect(assetId); }
  }

  const selectedHealth = healthTargets.filter((target) => target.assetId === selectedHostId);
  const selectedHasMetricTarget = selectedHostId !== null && metricAssetIds.has(selectedHostId);

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Infrastructure</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Hosts & Assets</h1><p className="mt-1 text-sm text-slate-500">Health and resource snapshots across registered infrastructure.</p></div><CreateAssetDialog /></header>

    <Card className="overflow-hidden border-slate-200 bg-white shadow-none"><CardContent className="p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 pt-4" role="group" aria-label="Filter asset type">
        {([
          ["ALL", "All", assets.length],
          ["SERVER", "Servers", assets.filter((asset) => asset.targetType === "SERVER").length],
          ["APPLICATION", "Applications", assets.filter((asset) => asset.targetType === "APPLICATION").length],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={typeFilter === value}
            onClick={() => setTypeFilter(value)}
            className={`rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              typeFilter === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {label} <span className="tabular-nums">({count})</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-4">
        {overallFilter.length > 0 && <div className="flex w-full items-center gap-2 text-xs text-blue-700"><span>Dashboard status: {overallFilter.join(", ")}{overviewQuery.data?.dataQuality?.stale ? " (last successful snapshot)" : ""}</span><button type="button" onClick={clearOverallFilter} className="font-medium underline">Clear</button></div>}
        <div className="relative w-full sm:w-72"><Search className="absolute top-2.5 left-3 size-4 text-slate-400" /><Input aria-label="Search hosts" placeholder="Search by name or IP" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
        <Select value={sortOrder} onValueChange={(value) => { if (value === "HEALTH" || value === "NAME_ASC" || value === "NAME_DESC" || value === "SERVER_FIRST" || value === "APP_FIRST") setSortOrder(value); }}>
          <SelectTrigger aria-label="Sort infrastructure" className="w-full bg-white sm:w-60"><SelectValue>{sortOrder === "HEALTH" ? "Health Status (Issues First)" : sortOrder === "NAME_ASC" ? "Name (A-Z)" : sortOrder === "NAME_DESC" ? "Name (Z-A)" : sortOrder === "SERVER_FIRST" ? "Type (Servers First)" : "Type (Apps First)"}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="HEALTH">Health Status (Issues First)</SelectItem><SelectItem value="NAME_ASC">Name (A-Z)</SelectItem><SelectItem value="NAME_DESC">Name (Z-A)</SelectItem><SelectItem value="SERVER_FIRST">Type (Servers First)</SelectItem><SelectItem value="APP_FIRST">Type (Apps First)</SelectItem></SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { if (value === "ALL" || value === "ACTIVATE" || value === "INACTIVATE" || value === "DEACTIVATE") setStatusFilter(value); }}><SelectTrigger aria-label="Filter by asset status" className="w-40 bg-white"><SelectValue>{statusFilter === "ALL" ? "All statuses" : statusFilter === "ACTIVATE" ? "Active" : statusFilter === "INACTIVATE" ? "Inactive" : "Deactivated"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVATE">Active</SelectItem><SelectItem value="INACTIVATE">Inactive</SelectItem><SelectItem value="DEACTIVATE">Deactivated</SelectItem></SelectContent></Select>
        <span className="ml-auto text-xs text-slate-500">{filteredAssets.length} of {assets.length} assets</span>
      </div>

      {assetsQuery.isLoading || (overallFilter.length > 0 && overviewQuery.isLoading) ? <p className="px-5 py-14 text-center text-sm text-slate-500">Loading infrastructure...</p> : assetsQuery.isError || (overallFilter.length > 0 && overviewQuery.isError) ? <p role="alert" className="px-5 py-14 text-center text-sm text-rose-600">Could not load infrastructure status.</p> : <div className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-4">Host name</TableHead><TableHead>IP address</TableHead><TableHead>Status</TableHead><TableHead>Uptime / check</TableHead><TableHead>CPU / Memory</TableHead><TableHead className="pr-4 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {filteredAssets.length === 0 ? <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-slate-500">{assets.length ? "No assets match the current filters." : "No assets registered yet."}</TableCell></TableRow> : filteredAssets.map((asset) => {
          const checks = healthByAsset.get(asset.assetId) ?? [];
          const check = latestCheck(checks);
          const healthStatus = check ? check.enabled ? getHealthResultStatus(check) : "PAUSED" : null;
          const overviewStatus = overviewByAsset.get(asset.assetId);
          const assetStatus = overallFilter.length > 0 && overviewStatus
            ? overallBadges[overviewStatus]
            : statusFor(asset, checks);
          const hasMetricTarget = metricAssetIds.has(asset.assetId);
          return <TableRow key={asset.assetId} tabIndex={0} aria-label={`Inspect ${asset.name}`} aria-selected={selectedHostId === asset.assetId} className={`cursor-pointer focus-visible:outline-blue-500 ${selectedHostId === asset.assetId ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50/50 focus-visible:bg-blue-50"}`} onClick={() => inspect(asset.assetId)} onKeyDown={(event) => onRowKeyDown(event, asset.assetId)}>
            <TableCell className="pl-4"><span className="flex items-center gap-2 font-medium text-slate-900">{asset.targetType === "SERVER" ? <Server className="size-4 shrink-0 text-slate-500" /> : asset.targetType === "APPLICATION" ? <Globe className="size-4 shrink-0 text-indigo-600" /> : <Activity className="size-4 shrink-0 text-slate-500" />}{asset.name}</span><span className="ml-6 text-xs text-slate-500">{asset.environment}</span></TableCell>
            <TableCell className="font-mono text-xs">{asset.ipAddress ? <span className="flex items-center gap-1">{asset.ipAddress}<CopyIpButton ipAddress={asset.ipAddress} compact /></span> : <span className="text-slate-400">—</span>}</TableCell>
            <TableCell><Badge variant="outline" className={assetStatus.className}>{assetStatus.label}</Badge></TableCell>
            <TableCell className="text-xs">{healthQuery.isLoading ? "Loading..." : healthQuery.isError ? "Unavailable" : !check ? "No check" : healthStatus === "AVAILABLE" ? <span className="text-emerald-700">Passing ({check.latest?.statusCode ?? "—"})</span> : healthStatus === "UNAVAILABLE" ? <span className="text-rose-600">Failed ({check.latest?.statusCode ?? "No response"})</span> : healthStatus === "STALE" ? <span className="text-amber-700">Stale</span> : healthStatus === "PAUSED" ? "Paused" : "No result"}</TableCell>
            <TableCell className="text-xs"><ResourceSnapshot assetId={asset.assetId} enabled={asset.targetType === "SERVER" && hasMetricTarget && asset.status === "ACTIVATE"} /></TableCell>
            <TableCell className="pr-4"><div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><Button size="sm" variant="outline" onClick={() => inspect(asset.assetId)}>Inspect</Button><AssetActions asset={asset} /></div></TableCell>
          </TableRow>;
        })}
      </TableBody></Table></div>}
    </CardContent></Card>

    {targetsQuery.isError && <p role="status" className="text-sm text-amber-700">Monitoring targets could not be loaded; resource snapshots may be unavailable.</p>}
    <HostInspectionDrawer asset={selectedAsset} healthChecks={selectedHealth} hasMetricTarget={selectedHasMetricTarget} notMonitored={selectedHostId !== null && overviewByAsset.get(selectedHostId) === "NOT_MONITORED"} onClose={() => inspect(null)} />
  </section>;
}

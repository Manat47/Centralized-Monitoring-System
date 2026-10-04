"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, Search, Server } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { AssetActions } from "@/app/features/assets/components/asset-actions";
import { CreateAssetDialog } from "@/app/features/assets/components/create-asset-dialog";
import type { Asset } from "@/app/features/assets/types/asset";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
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
import { HostInspectionDrawer } from "./host-inspection-drawer";

type StatusFilter = "ALL" | "ACTIVATE" | "INACTIVATE" | "DEACTIVATE";

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
  if (!enabled) return <span className="text-slate-400">No active metrics</span>;
  if (query.isLoading) return <span className="text-slate-400">Loading...</span>;
  if (query.isError) return <span className="text-rose-600">Unavailable</span>;
  return <span className="whitespace-nowrap">CPU {formatPercent(query.data?.cpu.averageUsagePercent)} <span className="text-slate-300">/</span> Mem {formatPercent(query.data?.memory?.usagePercent)}</span>;
}

export function InfrastructureConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedHostId = searchParams.get("inspectHost");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const assetsQuery = useAssets();
  const targetsQuery = useMonitoringTargets();
  const healthQuery = useHealthCheckTargets();
  const assets = useMemo(() => assetsQuery.data ?? [], [assetsQuery.data]);
  const monitoringTargets = targetsQuery.data ?? [];
  const healthTargets = healthQuery.data ?? [];
  const selectedAsset = assets.find((asset) => asset.assetId === selectedHostId) ?? null;
  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) =>
      (statusFilter === "ALL" || asset.status === statusFilter) &&
      (!term || [asset.name, asset.hostname, asset.ipAddress, asset.endpoint].some((value) => value?.toLowerCase().includes(term))),
    ).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) || a.assetId.localeCompare(b.assetId));
  }, [assets, search, statusFilter]);

  function inspect(assetId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (assetId) params.set("inspectHost", assetId);
    else params.delete("inspectHost");
    router.replace(`/infrastructure${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, assetId: string) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inspect(assetId); }
  }

  function copyIp(event: MouseEvent<HTMLButtonElement>, ipAddress: string) {
    event.stopPropagation();
    void navigator.clipboard.writeText(ipAddress);
  }

  const selectedHealth = healthTargets.filter((target) => target.assetId === selectedHostId);
  const selectedHasMetricTarget = monitoringTargets.some((target) => target.assetId === selectedHostId && !target.archivedAt && target.monitoringEnabled);

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Infrastructure</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Hosts & Assets</h1><p className="mt-1 text-sm text-slate-500">Health and resource snapshots across registered infrastructure.</p></div><CreateAssetDialog /></header>

    <Card className="overflow-hidden border-slate-200 bg-white shadow-none"><CardContent className="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-4">
        <div className="relative w-full sm:w-72"><Search className="absolute top-2.5 left-3 size-4 text-slate-400" /><Input aria-label="Search hosts" placeholder="Search by name or IP" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={(value) => { if (value === "ALL" || value === "ACTIVATE" || value === "INACTIVATE" || value === "DEACTIVATE") setStatusFilter(value); }}><SelectTrigger aria-label="Filter by asset status" className="w-40 bg-white"><SelectValue>{statusFilter === "ALL" ? "All statuses" : statusFilter === "ACTIVATE" ? "Active" : statusFilter === "INACTIVATE" ? "Inactive" : "Deactivated"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVATE">Active</SelectItem><SelectItem value="INACTIVATE">Inactive</SelectItem><SelectItem value="DEACTIVATE">Deactivated</SelectItem></SelectContent></Select>
        <span className="ml-auto text-xs text-slate-500">{filteredAssets.length} of {assets.length} assets</span>
      </div>

      {assetsQuery.isLoading ? <p className="px-5 py-14 text-center text-sm text-slate-500">Loading infrastructure...</p> : assetsQuery.isError ? <p role="alert" className="px-5 py-14 text-center text-sm text-rose-600">Could not load assets.</p> : <div className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-4">Host name</TableHead><TableHead>IP address</TableHead><TableHead>Status</TableHead><TableHead>Uptime / check</TableHead><TableHead>CPU / Memory</TableHead><TableHead className="pr-4 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {filteredAssets.length === 0 ? <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-slate-500">{assets.length ? "No assets match the current filters." : "No assets registered yet."}</TableCell></TableRow> : filteredAssets.map((asset) => {
          const checks = healthTargets.filter((target) => target.assetId === asset.assetId);
          const check = latestCheck(checks);
          const healthStatus = check ? check.enabled ? getHealthResultStatus(check) : "PAUSED" : null;
          const assetStatus = statusFor(asset, checks);
          const hasMetricTarget = monitoringTargets.some((target) => target.assetId === asset.assetId && !target.archivedAt && target.monitoringEnabled);
          return <TableRow key={asset.assetId} tabIndex={0} aria-label={`Inspect ${asset.name}`} className="cursor-pointer hover:bg-blue-50/50 focus-visible:bg-blue-50 focus-visible:outline-blue-500" onClick={() => inspect(asset.assetId)} onKeyDown={(event) => onRowKeyDown(event, asset.assetId)}>
            <TableCell className="pl-4"><span className="flex items-center gap-2 font-medium text-slate-900"><Server className="size-4 text-slate-400" />{asset.name}</span><span className="ml-6 text-xs text-slate-500">{asset.targetType} · {asset.environment}</span></TableCell>
            <TableCell className="font-mono text-xs">{asset.ipAddress ? <span className="flex items-center gap-1">{asset.ipAddress}<button type="button" aria-label={`Copy IP ${asset.ipAddress}`} className="rounded p-1 text-slate-400 hover:text-blue-700" onClick={(event) => { if (asset.ipAddress) copyIp(event, asset.ipAddress); }}><Copy className="size-3" /></button></span> : <span className="text-slate-400">—</span>}</TableCell>
            <TableCell><Badge variant="outline" className={assetStatus.className}>{assetStatus.label}</Badge></TableCell>
            <TableCell className="text-xs">{healthQuery.isLoading ? "Loading..." : healthQuery.isError ? "Unavailable" : !check ? "No check" : healthStatus === "AVAILABLE" ? <span className="text-emerald-700">Passing ({check.latest?.statusCode ?? "—"})</span> : healthStatus === "UNAVAILABLE" ? <span className="text-rose-600">Failed ({check.latest?.statusCode ?? "No response"})</span> : healthStatus === "STALE" ? <span className="text-amber-700">Stale</span> : healthStatus === "PAUSED" ? "Paused" : "No result"}</TableCell>
            <TableCell className="text-xs"><ResourceSnapshot assetId={asset.assetId} enabled={hasMetricTarget && asset.status === "ACTIVATE"} /></TableCell>
            <TableCell className="pr-4"><div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><Button size="sm" variant="outline" onClick={() => inspect(asset.assetId)}>Inspect</Button><AssetActions asset={asset} /></div></TableCell>
          </TableRow>;
        })}
      </TableBody></Table></div>}
    </CardContent></Card>

    {targetsQuery.isError && <p role="status" className="text-sm text-amber-700">Monitoring targets could not be loaded; resource snapshots may be unavailable.</p>}
    <HostInspectionDrawer key={selectedAsset?.assetId ?? "closed"} asset={selectedAsset} healthChecks={selectedHealth} hasMetricTarget={selectedHasMetricTarget} onClose={() => inspect(null)} />
  </section>;
}

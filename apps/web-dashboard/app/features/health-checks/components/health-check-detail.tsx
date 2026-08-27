"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getHealthCheckHistory, getHealthCheckReportSummary } from "../api/get-health-check-detail";
import { useHealthCheckTargets } from "../api/use-health-check-targets";
import { getHealthResultStatus, getHealthRuntimeState, hasOriginMismatch } from "./health-check-status";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function HealthCheckDetail() {
  const params = useParams<{ healthCheckTargetId: string }>();
  const id = params.healthCheckTargetId;
  const [rangeMinutes, setRangeMinutes] = useState(60);
  const targetsQuery = useHealthCheckTargets();
  const assetsQuery = useAssets();
  const target = (targetsQuery.data ?? []).find((item) => item.healthCheckTargetId === id);
  const asset = (assetsQuery.data ?? []).find((item) => item.assetId === target?.assetId);
  const range = useMemo(() => {
    const end = new Date();
    return { start: new Date(end.getTime() - rangeMinutes * 60_000), end };
  }, [rangeMinutes]);
  const historyQuery = useQuery({
    queryKey: ["health-check-targets", id, "history", rangeMinutes],
    queryFn: () => getHealthCheckHistory(id, range.start, range.end),
    enabled: Boolean(target),
    refetchInterval: 15_000,
  });
  const summaryQuery = useQuery({
    queryKey: ["health-check-targets", id, "report-summary", rangeMinutes],
    queryFn: () => getHealthCheckReportSummary(id, range.start, range.end),
    enabled: Boolean(target),
    refetchInterval: 15_000,
  });

  if (targetsQuery.isLoading || assetsQuery.isLoading) return <HealthCheckDetailSkeleton />;
  if (!target) return <Message text="Health check not found." destructive />;

  const history = historyQuery.data ?? [];
  const summary = summaryQuery.data;
  const result = getHealthResultStatus(target);
  const runtime = getHealthRuntimeState(target, asset);
  const chartOption: EChartsOption = {
    animation: false,
    grid: { left: 48, right: 24, top: 20, bottom: 36 },
    tooltip: { trigger: "axis", valueFormatter: (value) => `${value} ms` },
    xAxis: { type: "time", axisLabel: { color: "#64748b", fontSize: 11 }, splitLine: { show: false } },
    yAxis: { type: "value", min: 0, axisLabel: { formatter: "{value}ms", color: "#64748b", fontSize: 11 }, splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } } },
    series: [{ type: "line", smooth: true, symbol: "none", lineStyle: { color: "#2563eb", width: 2 }, areaStyle: { color: "rgba(37,99,235,0.08)" }, data: history.map((point) => [point.timestamp, point.responseTimeMs]) }],
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">Health Checks / {target.url}</p>
        <h1 className="mt-2 text-2xl font-semibold">{asset?.name ?? "Application"} — health check</h1>
      </div>

      <Card className="border-slate-200 shadow-none"><CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Info label="URL" value={target.url} mono />
        <Info label="State" value={runtime.replaceAll("_", " ")} />
        <Info label="Availability" value={result} />
        <Info label="Last HTTP status" value={target.latest?.statusCode?.toString() ?? "—"} />
        <Info label="Response time" value={target.latest ? `${target.latest.responseTimeMs} ms` : "—"} />
      </CardContent></Card>

      {hasOriginMismatch(asset?.endpoint ?? null, target.url) && <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This health URL uses a different origin from the current application endpoint.</div>}

      <div className="flex justify-stretch sm:justify-end"><Select value={String(rangeMinutes)} onValueChange={(value) => setRangeMinutes(Number(value ?? 60))}><SelectTrigger className="w-full bg-white sm:w-40"><SelectValue>{rangeMinutes === 60 ? "Last 1 hour" : rangeMinutes === 360 ? "Last 6 hours" : "Last 24 hours"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="60">Last 1 hour</SelectItem><SelectItem value="360">Last 6 hours</SelectItem><SelectItem value="1440">Last 24 hours</SelectItem></SelectContent></Select></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Stat label="Availability" value={summary?.availabilityPercent == null ? "—" : `${summary.availabilityPercent}%`} />
        <Stat label="Total checks" value={summary?.totalChecks ?? "—"} />
        <Stat label="Successful" value={summary?.successfulChecks ?? "—"} />
        <Stat label="Failed" value={summary?.failedChecks ?? "—"} />
        <Stat label="Failed HTTP" value={summary?.failedHttpChecks ?? "—"} />
        <Stat label="No response" value={summary?.noResponseChecks ?? "—"} />
        <Stat label="Avg response" value={summary?.responseTime.averageMs == null ? "—" : `${summary.responseTime.averageMs} ms`} />
        <Stat label="P95 response" value={summary?.responseTime.p95Ms == null ? "—" : `${summary.responseTime.p95Ms} ms`} />
      </div>

      <Card className="border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Response Time</CardTitle><p className="text-xs text-slate-500">Historical response time for each check</p></CardHeader><CardContent className="p-4">{historyQuery.isLoading ? <Message text="Loading response history..." /> : history.length === 0 ? <Message text="No checks in this time range." /> : <ReactECharts option={chartOption} style={{ height: 280 }} notMerge />}</CardContent></Card>

      <Card className="overflow-hidden border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Health History</CardTitle><p className="text-xs text-slate-500">Most recent individual check results</p></CardHeader><CardContent className="p-0"><Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Result</TableHead><TableHead>HTTP</TableHead><TableHead>Response time</TableHead><TableHead>Error</TableHead></TableRow></TableHeader><TableBody>{[...history].reverse().slice(0, 100).map((point) => { const success = point.statusCode !== null && point.statusCode >= 200 && point.statusCode < 300; return <TableRow key={point.timestamp} className="transition-colors duration-150"><TableCell className="font-mono text-xs">{new Date(point.timestamp).toLocaleString()}</TableCell><TableCell><Badge variant="outline" className={success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>{success ? "Success" : "Failed"}</Badge></TableCell><TableCell>{point.statusCode ?? "—"}</TableCell><TableCell>{point.responseTimeMs} ms</TableCell><TableCell className="max-w-md truncate text-xs text-rose-600" title={point.error ?? undefined}>{point.error ?? "—"}</TableCell></TableRow>; })}</TableBody></Table></CardContent></Card>
    </section>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 truncate text-sm font-medium ${mono ? "font-mono text-xs" : ""}`} title={value}>{value}</p></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>; }
function Message({ text, destructive }: { text: string; destructive?: boolean }) { return <div className={`py-12 text-center text-sm ${destructive ? "text-rose-600" : "text-slate-500"}`}>{text}</div>; }
function HealthCheckDetailSkeleton() { return <section className="space-y-6" aria-label="Loading health check details"><div className="space-y-3"><Skeleton className="h-3 w-72 max-w-full" /><Skeleton className="h-7 w-80 max-w-full" /></div><Card className="border-slate-200 shadow-none"><CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-28" /></div>)}</CardContent></Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div><Skeleton className="h-80 w-full" /></section>; }

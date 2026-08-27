"use client";

import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, CircleCheck, CircleX, ExternalLink } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { getCpuUsage } from "@/app/features/monitoring-targets/api/get-cpu-usage";
import { getDiskUsage } from "@/app/features/monitoring-targets/api/get-disk-usage";
import { getMemoryUsage } from "@/app/features/monitoring-targets/api/get-memory-usage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAlertById } from "../api/use-alert-by-id";
import { useAcknowledgeAlert, useCloseAlert } from "../api/use-alert-actions";
import type { Alert, AlertDetail, AlertLifecycleEvent } from "../types/alert";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function AlertDetailView() {
  const { alertId } = useParams<{ alertId: string }>();
  const alertQuery = useAlertById(alertId);
  const assetsQuery = useAssets();
  const acknowledgeMutation = useAcknowledgeAlert();
  const closeMutation = useCloseAlert();
  const alert = alertQuery.data;
  const asset = (assetsQuery.data ?? []).find((item) => item.assetId === alert?.assetId);

  if (alertQuery.isLoading || assetsQuery.isLoading) return <AlertDetailSkeleton />;
  if (alertQuery.isError || !alert) return <Message text={alertQuery.error instanceof Error ? alertQuery.error.message : "Alert not found."} destructive />;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">Alerts / {alert.alertId}</p>
        <h1 className="mt-2 text-2xl font-semibold">{alert.severity === "CRITICAL" ? "Critical" : "Warning"} alert — {asset?.name ?? alert.assetId}</h1>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <Lifecycle alert={alert} assetName={asset?.name} />
          {alert.sourceType === "HEALTH_CHECK" ? <HealthContext alert={alert} /> : <MetricContext alert={alert} />}
        </div>
        <div className="space-y-6">
          <Details alert={alert} assetName={asset?.name} />
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-4">
              {alert.status === "TRIGGERED" && <Button type="button" className="w-full" disabled={acknowledgeMutation.isPending} aria-busy={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(alert.alertId)}><Check />{acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge alert"}</Button>}
              {alert.status === "RESOLVED" && <Button type="button" className="w-full" disabled={closeMutation.isPending} aria-busy={closeMutation.isPending} onClick={() => closeMutation.mutate(alert.alertId)}><CircleX />{closeMutation.isPending ? "Closing..." : "Close alert"}</Button>}
              {alert.status === "ACKNOWLEDGED" && <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">Acknowledged. The alert will resolve automatically when the signal recovers.</p>}
              {alert.status === "CLOSED" && <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-600">This alert is closed.</p>}
              <Link href={`/assets/${alert.assetId}`} className="group flex items-center justify-center gap-1 rounded-sm text-sm text-blue-600 transition-colors duration-150 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">View asset <ExternalLink className="size-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Lifecycle({ alert, assetName }: { alert: AlertDetail; assetName?: string }) {
  const events = [...alert.lifecycle].sort(
    (left, right) =>
      new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );

  return <Card className="border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Lifecycle</CardTitle><p className="text-xs text-slate-500">Events that actually occurred for this alert</p></CardHeader><CardContent className="p-5"><ol>{events.map((event, index) => <li key={event.lifecycleEventId} className="relative flex gap-3 pb-6 last:pb-0">{index < events.length - 1 && <span className="absolute left-2 top-4 h-full w-px bg-blue-300" />}<span className="relative z-10 mt-0.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="size-3" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{eventTitle(event)}</span><span className="font-mono text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{eventDescription(event, alert, assetName)}</p></div></li>)}</ol></CardContent></Card>;
}

function HealthContext({ alert }: { alert: Alert }) {
  const url = typeof alert.context?.url === "string" ? alert.context.url : null;
  return <Card className="border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Health check context</CardTitle><p className="text-xs text-slate-500">Endpoint result that produced this alert</p></CardHeader><CardContent className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-3"><Info label="URL" value={url ?? "—"} /><Info label="HTTP" value={contextValue(alert, "statusCode")} /><Info label="Response" value={alert.context?.responseTimeMs == null ? "—" : `${String(alert.context.responseTimeMs)} ms`} /></div>{alert.context?.error != null && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{String(alert.context.error)}</p>}<Link href={`/health-checks/${alert.sourceId}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">View health check history <ExternalLink className="size-3" /></Link></CardContent></Card>;
}

function MetricContext({ alert }: { alert: Alert }) {
  const start = new Date(new Date(alert.triggeredAt).getTime() - 30 * 60_000).toISOString();
  const terminal = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : Date.now();
  const end = new Date(Math.min(terminal + 30 * 60_000, new Date(alert.triggeredAt).getTime() + 24 * 60 * 60_000)).toISOString();
  const metricQuery = useQuery({
    queryKey: ["alert-metric-context", alert.alertId, start, end],
    queryFn: async () => {
      if (alert.metricType === "CPU_USAGE") {
        const values = await getCpuUsage({ assetId: alert.assetId, start, end });
        const grouped = new Map<string, number[]>();
        values.forEach((point) => grouped.set(point.timestamp, [...(grouped.get(point.timestamp) ?? []), point.usagePercent]));
        return [...grouped].map(([timestamp, valuesAtTime]) => [timestamp, valuesAtTime.reduce((sum, value) => sum + value, 0) / valuesAtTime.length] as [string, number]);
      }
      if (alert.metricType === "MEMORY_USAGE") return (await getMemoryUsage({ assetId: alert.assetId, start, end })).map((point) => [point.timestamp, point.usagePercent] as [string, number]);
      if (alert.metricType === "DISK_USAGE") {
        const values = await getDiskUsage({ assetId: alert.assetId, start, end });
        const grouped = new Map<string, number>();
        values.forEach((point) => grouped.set(point.timestamp, Math.max(grouped.get(point.timestamp) ?? 0, point.usagePercent)));
        return [...grouped] as [string, number][];
      }
      return [];
    },
  });
  const points = metricQuery.data ?? [];
  const option: EChartsOption = { animation: false, grid: { left: 48, right: 24, top: 22, bottom: 38 }, tooltip: { trigger: "axis", valueFormatter: (value) => `${Number(value).toFixed(1)}%` }, xAxis: { type: "time", axisLabel: { color: "#64748b", fontSize: 11 }, splitLine: { show: false } }, yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%", color: "#64748b", fontSize: 11 }, splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } } }, series: [{ type: "line", smooth: true, symbol: "none", lineStyle: { color: "#ef4444", width: 2 }, areaStyle: { color: "rgba(239,68,68,0.06)" }, data: points, markLine: alert.thresholdValue == null ? undefined : { symbol: "none", lineStyle: { color: "#f59e0b", type: "dashed" }, data: [{ yAxis: alert.thresholdValue, name: `Threshold ${alert.thresholdValue}%` }] } }] };
  return <Card className="border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">{alert.metricType.replaceAll("_", " ")} around the event</CardTitle><p className="text-xs text-slate-500">Metric values before and after the alert transition</p></CardHeader><CardContent className="p-4">{metricQuery.isLoading ? <Message text="Loading metric context..." /> : metricQuery.isError ? <Message text="Metric context is unavailable." destructive /> : points.length === 0 ? <Message text="No time-series context is available for this alert." /> : <ReactECharts option={option} style={{ height: 300 }} notMerge />}</CardContent></Card>;
}

function Details({ alert, assetName }: { alert: Alert; assetName?: string }) {
  const rows = [["Severity", alert.severity], ["Status", alert.status], ["Asset", assetName ?? alert.assetId], ["Source", alert.sourceType.replaceAll("_", " ")], ["Signal", alert.metricType.replaceAll("_", " ")], ["Actual", alert.actualText ?? (alert.actualValue == null ? "—" : String(alert.actualValue))], ["Threshold", alert.thresholdValue == null ? "—" : `${alert.thresholdValue}%`], ["Triggered", new Date(alert.triggeredAt).toLocaleString()], ["Acknowledged", alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleString() : "—"], ["Resolved", alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : "—"], ["Closed", alert.closedAt ? new Date(alert.closedAt).toLocaleString() : "—"]];
  return <Card className="border-slate-200 shadow-none"><CardHeader className="border-b border-slate-200"><CardTitle className="text-sm">Alert details</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className="max-w-52 break-words text-right font-medium">{value}</span></div>)}</CardContent></Card>;
}

function eventTitle(event: AlertLifecycleEvent): string {
  if (event.eventType === "RESOLVED" && !event.actorUserId) return "Resolved automatically";
  return event.eventType[0] + event.eventType.slice(1).toLowerCase();
}

function eventDescription(event: AlertLifecycleEvent, alert: Alert, assetName?: string): string {
  if (event.eventType === "ACKNOWLEDGED") return "Acknowledged manually by an operator.";
  if (event.eventType === "CLOSED") return "Closed manually after the alert was resolved.";

  if (alert.sourceType === "METRIC_RULE") {
    const metric = alert.metricType.replaceAll("_", " ").toLowerCase();

    if (event.eventType === "TRIGGERED") {
      const parsed = event.reason?.match(/:\s*([\d.]+)%\s*>=\s*([\d.]+)%\s*for\s*(\d+)s/i);
      if (parsed) return `${metric} reached ${parsed[1]}%, above the ${parsed[2]}% threshold for ${parsed[3]}s.`;
      return `${metric} crossed the configured threshold for ${assetName ?? "this asset"}.`;
    }

    if (event.eventType === "RESOLVED") {
      const actual = alert.actualValue == null ? "the normal range" : `${alert.actualValue.toFixed(2)}%`;
      const threshold = alert.thresholdValue == null ? "the configured threshold" : `${alert.thresholdValue}%`;
      return `${metric} recovered to ${actual}, below ${threshold}.`;
    }
  }

  return event.reason ?? (event.eventType === "RESOLVED" ? "The monitored endpoint recovered." : "Alert state changed.");
}
function contextValue(alert: Alert, key: string) { const value = alert.context?.[key]; return value == null ? "—" : String(value); }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 break-words font-mono text-xs font-medium">{value}</p></div>; }
function Message({ text, destructive }: { text: string; destructive?: boolean }) { return <div className={`py-12 text-center text-sm ${destructive ? "text-rose-600" : "text-slate-500"}`}><span className="inline-flex items-center gap-2">{destructive ? <AlertTriangle className="size-4" /> : <CircleCheck className="size-4" />}{text}</span></div>; }

function AlertDetailSkeleton() {
  return <section className="space-y-6" aria-label="Loading alert details"><div className="space-y-3"><Skeleton className="h-3 w-44" /><Skeleton className="h-7 w-80 max-w-full" /></div><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"><div className="space-y-6"><Card className="border-slate-200 shadow-none"><CardHeader className="space-y-2 border-b border-slate-200"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-64 max-w-full" /></CardHeader><CardContent className="space-y-6 p-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex gap-3"><Skeleton className="size-4 shrink-0 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-3/4" /></div></div>)}</CardContent></Card><Skeleton className="h-80 w-full" /></div><div className="space-y-6"><Skeleton className="h-96 w-full" /><Skeleton className="h-36 w-full" /></div></div></section>;
}

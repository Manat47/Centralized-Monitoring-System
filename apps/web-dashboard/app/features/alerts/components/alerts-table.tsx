"use client";

import { Check, ChevronRight, CircleX, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useAcknowledgeAlert, useCloseAlert } from "../api/use-alert-actions";
import { useAlerts } from "../api/use-alerts";
import type { Alert, AlertSeverity, AlertSourceType, AlertStatus } from "../types/alert";

function badgeClass(alert: Alert, kind: "status" | "severity") {
  const value = kind === "status" ? alert.status : alert.severity;
  if (value === "CRITICAL" || value === "TRIGGERED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "WARNING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "RESOLVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "ACKNOWLEDGED") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatValue(alert: Alert): string {
  if (alert.actualText) return alert.actualText;
  if (alert.actualValue === null) return "—";
  return alert.metricType.endsWith("_USAGE") ? `${alert.actualValue.toFixed(1)}%` : String(alert.actualValue);
}

export function AlertsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | AlertStatus>("ALL");
  const [severity, setSeverity] = useState<"ALL" | AlertSeverity>("ALL");
  const [assetId, setAssetId] = useState("ALL");
  const [sourceType, setSourceType] = useState<"ALL" | AlertSourceType>("ALL");
  const assetsQuery = useAssets();
  const acknowledgeMutation = useAcknowledgeAlert();
  const closeMutation = useCloseAlert();
  const assetNames = useMemo(() => new Map((assetsQuery.data ?? []).map((asset) => [asset.assetId, asset.name])), [assetsQuery.data]);
  const { data, isLoading, isError, error, isFetching } = useAlerts({
    page,
    limit: 20,
    search: search.trim() || undefined,
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity,
    assetId: assetId === "ALL" ? undefined : assetId,
    sourceType: sourceType === "ALL" ? undefined : sourceType,
  });
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  if (isLoading) return <Message text="Loading alerts..." />;
  if (isError) return <Message text={error instanceof Error ? error.message : "Failed to load alerts"} destructive />;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-4">
          <div className="relative min-w-64 flex-1 sm:max-w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search metric or message..." className="pl-9" />
          </div>
          <Filter value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }} label="All statuses" options={["TRIGGERED", "ACKNOWLEDGED", "RESOLVED", "CLOSED"]} />
          <Filter value={severity} onValueChange={(value) => { setSeverity(value as typeof severity); setPage(1); }} label="All severities" options={["WARNING", "CRITICAL"]} />
          <Filter value={sourceType} onValueChange={(value) => { setSourceType(value as typeof sourceType); setPage(1); }} label="All sources" options={["METRIC_RULE", "HEALTH_CHECK"]} />
          <Select value={assetId} onValueChange={(value) => { setAssetId(value ?? "ALL"); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white"><SelectValue>{assetId === "ALL" ? "All assets" : assetNames.get(assetId)}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All assets</SelectItem>{(assetsQuery.data ?? []).map((asset) => <SelectItem key={asset.assetId} value={asset.assetId}>{asset.name}</SelectItem>)}</SelectContent>
          </Select>
          <span className="ml-auto text-xs text-slate-500">{data?.total ?? 0} alerts{isFetching ? " · Updating" : ""}</span>
        </div>

        {(acknowledgeMutation.isError || closeMutation.isError) && <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{(acknowledgeMutation.error ?? closeMutation.error)?.message}</p>}

        <Table>
          <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Asset</TableHead><TableHead>Signal</TableHead><TableHead>Actual</TableHead><TableHead>Threshold</TableHead><TableHead>Status</TableHead><TableHead>Triggered</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.items.length === 0 ? <TableRow><TableCell colSpan={8} className="h-28 text-center text-slate-500">No alerts found.</TableCell></TableRow> : data?.items.map((alert) => (
              <TableRow key={alert.alertId} className={alert.status === "TRIGGERED" ? "bg-rose-50/30" : undefined}>
                <TableCell><Badge variant="outline" className={badgeClass(alert, "severity")}>{alert.severity}</Badge></TableCell>
                <TableCell className="font-medium">{assetNames.get(alert.assetId) ?? alert.assetId}</TableCell>
                <TableCell><div>{alert.metricType.replaceAll("_USAGE", "").replaceAll("_", " ")}</div><div className="text-xs text-slate-500">{alert.sourceType === "HEALTH_CHECK" ? "Health check" : "Metric rule"}</div></TableCell>
                <TableCell className="font-mono text-xs">{formatValue(alert)}</TableCell>
                <TableCell>{alert.thresholdValue === null ? "—" : `${alert.thresholdValue}%`}</TableCell>
                <TableCell><Badge variant="outline" className={badgeClass(alert, "status")}>{alert.status}</Badge></TableCell>
                <TableCell className="text-xs text-slate-600">{new Date(alert.triggeredAt).toLocaleString()}</TableCell>
                <TableCell><div className="flex justify-end gap-1">
                  {alert.status === "TRIGGERED" && <Button type="button" variant="outline" size="sm" disabled={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(alert.alertId)}><Check />Acknowledge</Button>}
                  {alert.status === "RESOLVED" && <Button type="button" variant="outline" size="sm" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(alert.alertId)}><CircleX />Close</Button>}
                  <Link href={`/alerts/${alert.alertId}`} aria-label="Open alert details" className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronRight className="size-4" /></Link>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">Page {data?.page ?? page} of {totalPages}</p>
          <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button type="button" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Filter({ value, onValueChange, label, options }: { value: string; onValueChange: (value: string | null) => void; label: string; options: string[] }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger className="w-40 bg-white"><SelectValue>{value === "ALL" ? label : value.replaceAll("_", " ")}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ALL">{label}</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>;
}

function Message({ text, destructive }: { text: string; destructive?: boolean }) {
  return <Card className="border-slate-200 shadow-none"><CardContent className={`py-14 text-center text-sm ${destructive ? "text-rose-600" : "text-slate-500"}`}>{text}</CardContent></Card>;
}

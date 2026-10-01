"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projectApi, type FacetValue, type LogEvent, type LogPage, type Usage } from "./api";

const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const bangkokInput = (value: string) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(new Date(value)).replace(" ", "T");
const issue = (cause: unknown) => cause instanceof Error ? cause.message : "Could not load records";
const blank = { source: "", eventType: "", severity: "", search: "", range: "24", from: "", to: "" };
type FilterState = typeof blank;
const colors: Record<string, string> = { INFO: "bg-emerald-500", WARN: "bg-amber-400", ERROR: "bg-rose-500", CRITICAL: "bg-red-700", Unspecified: "bg-slate-300" };

function parameters(filters: FilterState, offset = 0) {
  const result = new URLSearchParams({ limit: "50", offset: String(offset) });
  if (filters.range === "custom") {
    if (filters.from) result.set("from", new Date(`${filters.from}+07:00`).toISOString());
    if (filters.to) result.set("to", new Date(`${filters.to}+07:00`).toISOString());
  } else {
    const hours = Number(filters.range);
    result.set("from", new Date(Date.now() - hours * 3600_000 + (hours === 720 ? 60_000 : 0)).toISOString());
  }
  if (filters.source) result.set("source", filters.source);
  if (filters.eventType) result.set("event_type", filters.eventType);
  if (filters.severity) result.set("severity", filters.severity);
  if (filters.search.trim()) result.set("search", filters.search.trim());
  return result;
}

function FacetGroup({ title, values, onSelect }: { title: string; values: FacetValue[]; onSelect: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? values : values.slice(0, 5);
  return <div className="border-b border-slate-100 pb-3 last:border-0"><h3 className="mb-2 text-xs font-semibold text-slate-700">{title}</h3>
    {values.length === 0 ? <p className="text-xs text-slate-500">No values in this range</p> : shown.map((item) =>
      <button key={item.value} type="button" onClick={() => onSelect(item.value)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span className="truncate">{item.value}</span><span className="tabular-nums text-slate-500">{item.count}</span>
      </button>)}
    {values.length > 5 && <button type="button" className="mt-1 text-xs text-blue-700" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"}</button>}
  </div>;
}

export function LogExplorerPanel({ projectId, usage }: { projectId: string; usage: Usage | null }) {
  const [draft, setDraft] = useState<FilterState>(blank);
  const [applied, setApplied] = useState<FilterState>(blank);
  const [page, setPage] = useState<LogPage | null>(null);
  const [records, setRecords] = useState<LogEvent[]>([]);
  const [selected, setSelected] = useState<LogEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [sourceQuery, setSourceQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");
  const [sourceOptions, setSourceOptions] = useState<FacetValue[]>([]);
  const [eventOptions, setEventOptions] = useState<FacetValue[]>([]);

  const load = useCallback(async (filters: FilterState, offset = 0) => {
    setLoading(true); setError("");
    try {
      const next = await projectApi.logs(projectId, parameters(filters, offset));
      setPage(next);
      setRecords((current) => offset ? [...current, ...next.items] : next.items);
      setApplied(filters);
    } catch (cause) { setError(issue(cause)); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { const timer = window.setTimeout(() => { void load(blank); }, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const range = parameters({ ...blank, range: draft.range, from: draft.from, to: draft.to });
      const base = new URLSearchParams();
      if (range.has("from")) base.set("from", range.get("from")!);
      if (range.has("to")) base.set("to", range.get("to")!);
      const sourceParams = new URLSearchParams(base); sourceParams.set("field", "source"); sourceParams.set("q", sourceQuery);
      const eventParams = new URLSearchParams(base); eventParams.set("field", "event_type"); eventParams.set("q", eventQuery);
      void Promise.all([projectApi.logValues(projectId, sourceParams), projectApi.logValues(projectId, eventParams)])
        .then(([sources, events]) => { setSourceOptions(sources); setEventOptions(events); })
        .catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [projectId, draft.range, draft.from, draft.to, sourceQuery, eventQuery]);

  const buckets = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>();
    for (const item of page?.histogram ?? []) {
      const values = grouped.get(item.bucket) ?? {};
      values[item.severity] = (values[item.severity] ?? 0) + item.count;
      grouped.set(item.bucket, values);
    }
    return [...grouped.entries()].map(([time, parts]) => ({ time, parts, total: Object.values(parts).reduce((a, b) => a + b, 0) }));
  }, [page]);
  const maximum = Math.max(1, ...buckets.map((item) => item.total));

  function apply(event: FormEvent) { event.preventDefault(); void load(draft); }
  function facet(field: "source" | "eventType" | "severity" | "search", value: string) {
    const next = { ...applied, [field]: field === "search" ? `${applied.search} ${value}`.trim() : value };
    setDraft(next); void load(next);
  }
  function zoom(first: number, last: number) {
    const start = buckets[Math.min(first, last)]?.time;
    const end = buckets[Math.max(first, last) + 1]?.time ?? page?.to;
    if (!start || !end) return;
    const next = { ...applied, range: "custom", from: bangkokInput(start), to: bangkokInput(end) };
    setDraft(next); void load(next);
  }
  const chips = [applied.source && ["Source", applied.source, "source"], applied.eventType && ["Event type", applied.eventType, "eventType"], applied.severity && ["Severity", applied.severity, "severity"], applied.search && ["Search", applied.search, "search"]].filter(Boolean) as string[][];
  const emptyMessage = applied.range === "24" && chips.length === 0 && usage?.last24h
    ? usage.last24h.requests === 0 ? "No requests reached this project's Log API in the last 24 hours. This says nothing about activity inside the sending app."
      : usage.last24h.acceptedRequests === 0 ? "Requests reached the Log API, but none were accepted. Check the rejection reasons above."
      : usage.last24h.acceptedRecords > usage.last24h.storedRecords ? "Records were accepted by the queue and may still be processing. Refresh shortly."
      : "No records match this time range. Check the received-time filter."
    : "No records match this range and filters. Accepted requests may still be processing.";

  return <div className="space-y-4">
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Log &amp; Event Explorer</CardTitle><p className="text-sm text-slate-500">Records reported by your systems. Search uses only documented standard fields.</p></CardHeader><CardContent>
      <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1"><Label htmlFor="log-range">Time range (received, Bangkok)</Label><select id="log-range" value={draft.range} onChange={(event) => setDraft({ ...draft, range: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="720">Last 30 days</option><option value="custom">Custom range</option></select></div>
        <div className="space-y-1"><Label htmlFor="log-source-query">Source</Label><Input id="log-source-query" value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="Find a received source" /><select aria-label="Choose source" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All sources</option>{draft.source && !sourceOptions.some((item) => item.value === draft.source) && <option value={draft.source}>{draft.source}</option>}{sourceOptions.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="log-event-query">Event type</Label><Input id="log-event-query" value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder="Find a received event type" /><select aria-label="Choose event type" value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All event types</option>{draft.eventType && !eventOptions.some((item) => item.value === draft.eventType) && <option value={draft.eventType}>{draft.eventType}</option>}{eventOptions.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="log-severity">Severity</Label><select id="log-severity" value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All severities</option>{["INFO","WARN","ERROR","CRITICAL","Unspecified"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="space-y-1 xl:col-span-2"><Label htmlFor="log-search">Search message or standard fields</Label><Input id="log-search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="source:payment_gateway status_code >= 400" /></div>
        {draft.range === "custom" && <><div className="space-y-1"><Label htmlFor="log-from">From (Bangkok time)</Label><Input id="log-from" type="datetime-local" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} required /></div><div className="space-y-1"><Label htmlFor="log-to">To (Bangkok time)</Label><Input id="log-to" type="datetime-local" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} required /></div></>}
        <div className="flex items-end"><Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700"><Search className="mr-2 size-4" />{loading ? "Searching..." : "Search records"}</Button></div>
      </form>
      {page && <p className="mt-3 text-xs text-slate-500">Received {bangkok(page.from)} to {bangkok(page.to)} · Asia/Bangkok</p>}
      {chips.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{chips.map(([label, value, field]) => <button key={field} type="button" onClick={() => { const next = { ...applied, [field]: "" }; setDraft(next); void load(next); }} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800">{label}: {value}<X className="size-3" /></button>)}</div>}
    </CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-sm">Facets in this range</CardTitle></CardHeader><CardContent className="space-y-3">
        <FacetGroup title="Event types" values={page?.facets.eventTypes ?? []} onSelect={(value) => facet("eventType", value)} />
        <FacetGroup title="Status codes" values={page?.facets.statusCodes ?? []} onSelect={(value) => facet("search", value === "Unspecified" ? "status_code:Unspecified" : `status_code = ${value}`)} />
        <FacetGroup title="Client IP" values={page?.facets.ips ?? []} onSelect={(value) => facet("search", `ip:${value}`)} />
        <FacetGroup title="Location" values={page?.facets.locations ?? []} onSelect={(value) => facet("search", `location:${value.includes(" ") ? `"${value}"` : value}`)} />
      </CardContent></Card>
      <div className="min-w-0 space-y-4">
        <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-sm">Event volume by received time</CardTitle><p className="text-xs text-slate-500">Customer-reported severity. Drag across bars to zoom.</p></CardHeader><CardContent>
          {buckets.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No received records in this range.</p> : <div className="flex h-32 items-end gap-1 overflow-x-auto" aria-label="Event volume histogram">{buckets.map((bucket, index) => <button key={bucket.time} type="button" title={`${bangkok(bucket.time)} · ${bucket.total} records`} onPointerDown={() => setDragStart(index)} onPointerUp={() => { if (dragStart !== null) zoom(dragStart, index); setDragStart(null); }} onPointerCancel={() => setDragStart(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); zoom(index, index); } }} className="flex h-full min-w-2 flex-1 flex-col justify-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`${bangkok(bucket.time)}: ${bucket.total} records`}>
            {Object.entries(bucket.parts).map(([severity, count]) => <span key={severity} className={`block w-full ${colors[severity] ?? colors.Unspecified}`} style={{ height: `${Math.max(2, count / maximum * 100)}%` }} />)}
          </button>)}</div>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">{Object.keys(colors).map((value) => <span key={value} className="inline-flex items-center gap-1"><span className={`size-2 rounded ${colors[value]}`} />{value}</span>)}</div>
        </CardContent></Card>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-none"><CardContent className="p-0"><div className="border-b border-slate-200 p-4"><h2 className="text-sm font-semibold">Received records</h2><p className="text-xs text-slate-500">{page ? `${page.total} matching · ${records.length} shown` : "Loading..."}</p></div>
          <div className="overflow-x-auto"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead>Received (Bangkok)</TableHead><TableHead>Severity</TableHead><TableHead>Source</TableHead><TableHead>Event type</TableHead><TableHead>Duration</TableHead><TableHead>Message / preview</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>
            {loading && !page ? <TableRow><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow> : records.length === 0 ? <TableRow><TableCell colSpan={7} className="h-28 text-center text-slate-500">{emptyMessage}</TableCell></TableRow> : records.map((item) => <TableRow key={item.eventId}><TableCell className="whitespace-nowrap text-xs">{bangkok(item.receivedAt)}</TableCell><TableCell>{item.severity ?? "Unspecified"}</TableCell><TableCell>{item.source}</TableCell><TableCell><Badge variant="outline">{item.event_type}</Badge></TableCell><TableCell>{item.duration_ms === null ? "—" : `${item.duration_ms} ms`}</TableCell><TableCell className="max-w-64 truncate" title={item.message ?? undefined}>{item.message ?? JSON.stringify(item.rawPayload).slice(0, 100)}</TableCell><TableCell><Button type="button" size="sm" variant="ghost" onClick={() => setSelected(item)}>View JSON</Button></TableCell></TableRow>)}
          </TableBody></Table></div>{page?.nextOffset !== null && page && <div className="border-t border-slate-100 p-3 text-center"><Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load(applied, page.nextOffset!)}>Load more</Button></div>}
        </CardContent></Card>
      </div>
    </div>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="right-0 left-auto top-0 h-screen max-h-screen w-full max-w-xl translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:max-w-xl"><DialogHeader><DialogTitle>Record details</DialogTitle><DialogDescription>Customer payload and server envelope are shown separately.</DialogDescription></DialogHeader>{selected && <div className="space-y-4 text-sm"><div><h3 className="mb-2 font-semibold">Server envelope</h3><pre className="overflow-x-auto rounded bg-slate-100 p-3 text-xs">{JSON.stringify({ projectId: selected.projectId, tokenId: selected.tokenId, tokenName: selected.tokenName, requestId: selected.requestId, serverEventId: selected.eventId, receivedAt: selected.receivedAt, eventTime: selected.timestamp, timeSource: selected.timeSource, processingStatus: selected.processingStatus }, null, 2)}</pre></div><div><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Original payload</h3><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(JSON.stringify(selected.rawPayload, null, 2))}><Copy className="mr-1 size-3" />Copy JSON</Button></div><pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(selected.rawPayload, null, 2)}</pre></div></div>}</DialogContent></Dialog>
  </div>;
}

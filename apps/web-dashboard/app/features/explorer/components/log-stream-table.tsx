"use client";

import { useState } from "react";
import type { LogEvent, LogPage } from "@/app/features/projects/api";
import { Button } from "@/components/ui/button";
import { InlineJsonInspector } from "./inline-json-inspector";

const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const severityStyle: Record<string, string> = { INFO: "bg-emerald-50 text-emerald-700", WARN: "bg-amber-50 text-amber-700", ERROR: "bg-rose-50 text-rose-700", CRITICAL: "bg-red-100 text-red-800" };

export function LogStreamTable({ page, records, loading, excluded, onMore, onFilter }: {
  page: LogPage | null; records: LogEvent[]; loading: boolean; excluded: boolean;
  onMore: () => void; onFilter: (field: "source" | "event_type" | "severity", value: string, exclude: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><h2 className="text-sm font-semibold text-slate-900">Received records</h2><p className="text-xs text-slate-500">{page ? `${page.total} server matches · ${records.length} shown` : "Loading..."}{excluded ? " · exclusions apply to loaded records only" : ""}</p></div>
    <div className="divide-y divide-slate-100">{records.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">{loading ? "Loading records..." : "No records match this range and query."}</p> : records.map((record) => <div key={record.eventId}><button type="button" aria-expanded={expanded === record.eventId} onClick={() => setExpanded(expanded === record.eventId ? null : record.eventId)} className="grid w-full gap-2 p-3 text-left text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[150px_95px_1fr_1fr_2fr]"><span className="whitespace-nowrap text-xs text-slate-600">{bangkok(record.receivedAt)}</span><span><span className={`rounded px-2 py-0.5 text-xs ${severityStyle[record.severity ?? ""] ?? "bg-slate-100 text-slate-600"}`}>{record.severity ?? "Unspecified"}</span></span><span className="truncate" title={record.source}>{record.source}</span><span className="truncate" title={record.event_type}>{record.event_type}</span><span className="truncate text-slate-600" title={record.message ?? undefined}>{record.message ?? JSON.stringify(record.rawPayload).slice(0, 120)}</span></button>{expanded === record.eventId && <InlineJsonInspector record={record} onFilter={onFilter} />}</div>)}</div>
    {page?.nextOffset !== null && page && <div className="border-t border-slate-100 p-3 text-center"><Button type="button" size="sm" variant="outline" disabled={loading} onClick={onMore}>Load more</Button></div>}
  </section>;
}

"use client";

import { useState } from "react";
import type { LogEvent, LogPage } from "@/app/features/projects/api";
import { Button } from "@/components/ui/button";
import { displayFieldValue, fieldValue, type ExplorerField } from "../fields";
import { InlineJsonInspector } from "./inline-json-inspector";

const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const severityStyle: Record<string, string> = { INFO: "bg-emerald-50 text-emerald-700", WARN: "bg-amber-50 text-amber-700", ERROR: "bg-rose-50 text-rose-700", CRITICAL: "bg-red-100 text-red-800" };

export function LogStreamTable({ page, records, fields, selectedFields, loading, onMore, onFilter }: {
  page: LogPage | null; records: LogEvent[]; fields: ExplorerField[]; selectedFields: string[]; loading: boolean;
  onMore: () => void; onFilter: (field: string, value: string, exclude: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const columns = selectedFields.map((id) => fields.find((field) => field.id === id)).filter((field): field is ExplorerField => Boolean(field));
  const gridTemplateColumns = columns.map((field) => field.id === "message" ? "minmax(220px,2fr)" : field.id === "receivedAt" ? "minmax(155px,1fr)" : "minmax(125px,1fr)").join(" ");
  const minWidth = Math.max(700, columns.length * 145);

  function renderValue(record: LogEvent, field: ExplorerField) {
    const value = fieldValue(record, field.id);
    if (field.id === "receivedAt") return bangkok(record.receivedAt);
    if (field.id === "severity") return <span className={`rounded px-2 py-0.5 text-xs ${severityStyle[record.severity ?? ""] ?? "bg-slate-100 text-slate-600"}`}>{record.severity ?? "Unspecified"}</span>;
    if (field.id === "message") return record.message ?? JSON.stringify(record.rawPayload).slice(0, 120);
    return displayFieldValue(value);
  }

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-4"><h2 className="text-sm font-semibold text-slate-900">Received records</h2><p className="text-xs text-slate-500">{page ? `${page.total} server matches · ${records.length} shown` : "Loading..."}</p></div>
    <div className="overflow-x-auto">
      {columns.length > 0 && <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600" style={{ gridTemplateColumns, minWidth }}>{columns.map((field) => <span key={field.id} className="truncate" title={field.label}>{field.label}</span>)}</div>}
      <div className="divide-y divide-slate-100">{columns.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Select at least one field to show records.</p> : records.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">{loading ? "Loading records..." : "No records match this range and query."}</p> : records.map((record) => <div key={record.eventId} style={{ minWidth }}><button type="button" aria-expanded={expanded === record.eventId} onClick={() => setExpanded(expanded === record.eventId ? null : record.eventId)} className="grid w-full gap-2 p-3 text-left text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" style={{ gridTemplateColumns }}>{columns.map((field) => <span key={field.id} className="truncate" title={displayFieldValue(fieldValue(record, field.id))}>{renderValue(record, field)}</span>)}</button>{expanded === record.eventId && <InlineJsonInspector record={record} onFilter={onFilter} />}</div>)}</div>
    </div>
    {page?.nextOffset !== null && page && <div className="border-t border-slate-100 p-3 text-center"><Button type="button" size="sm" variant="outline" disabled={loading} onClick={onMore}>Load more</Button></div>}
  </section>;
}

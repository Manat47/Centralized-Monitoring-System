"use client";

import { useMemo, useState } from "react";
import type { LogPage } from "@/app/features/projects/api";

const colors: Record<string, string> = { INFO: "bg-emerald-500", WARN: "bg-amber-400", ERROR: "bg-rose-500", CRITICAL: "bg-red-700", Unspecified: "bg-slate-300" };
const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));

export function EventHistogram({ page, onZoom }: { page: LogPage | null; onZoom: (from: string, to: string) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const buckets = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>();
    for (const item of page?.histogram ?? []) {
      const parts = grouped.get(item.bucket) ?? {};
      parts[item.severity] = (parts[item.severity] ?? 0) + item.count;
      grouped.set(item.bucket, parts);
    }
    return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([time, parts]) => ({ time, parts, total: Object.values(parts).reduce((sum, count) => sum + count, 0) }));
  }, [page]);
  const maximum = Math.max(1, ...buckets.map((item) => item.total));
  function zoom(first: number, last: number) {
    const from = buckets[Math.min(first, last)]?.time;
    const to = buckets[Math.max(first, last) + 1]?.time ?? page?.to;
    if (from && to && Date.parse(from) < Date.parse(to)) onZoom(from, to);
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">Event volume by received time</h2><p className="mt-1 text-xs text-slate-500">Drag across bars to zoom. Severity comes from the sender.</p>
    {buckets.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No received records in this range.</p> : <div className="mt-4 flex h-36 items-end gap-1 overflow-x-auto select-none" aria-label="Event volume histogram">{buckets.map((bucket, index) => <button key={bucket.time} type="button" title={`${bangkok(bucket.time)} · ${bucket.total} records`} aria-label={`${bangkok(bucket.time)}: ${bucket.total} records`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setStart(index); }} onPointerUp={(event) => { if (start === null) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-bucket]"); const last = target ? Number(target.dataset.bucket) : index; zoom(start, Number.isFinite(last) ? last : index); setStart(null); }} onPointerCancel={() => setStart(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); zoom(index, index); } }} data-bucket={index} className="flex h-full min-w-2 flex-1 flex-col justify-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      {Object.entries(bucket.parts).map(([severity, count]) => <span key={severity} className={`block w-full ${colors[severity] ?? colors.Unspecified}`} style={{ height: `${Math.max(2, count / maximum * 100)}%` }} />)}
    </button>)}</div>}
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">{Object.keys(colors).map((level) => <span key={level} className="inline-flex items-center gap-1"><span className={`size-2 rounded ${colors[level]}`} />{level}</span>)}</div>
  </section>;
}

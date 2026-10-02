"use client";

import { useMemo, useState, type PointerEvent } from "react";
import type { LogPage } from "@/app/features/projects/api";

const levels = ["INFO", "WARN", "ERROR", "CRITICAL", "Unspecified"] as const;
const colors: Record<string, string> = { INFO: "bg-emerald-500", WARN: "bg-amber-400", ERROR: "bg-rose-500", CRITICAL: "bg-red-700", Unspecified: "bg-slate-300" };
const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(value));

export function EventHistogram({ page, onZoom }: { page: LogPage | null; onZoom: (from: string, to: string) => void }) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const buckets = useMemo(() => {
    if (!page) return [];
    const bucketMs = page.bucketSeconds * 1000;
    const first = Math.floor(Date.parse(page.from) / bucketMs) * bucketMs;
    const end = Date.parse(page.to);
    const counts = new Map<number, Record<string, number>>();
    for (const item of page.histogram) {
      const at = Date.parse(item.bucket);
      const values = counts.get(at) ?? {};
      values[item.severity] = (values[item.severity] ?? 0) + item.count;
      counts.set(at, values);
    }
    const result: Array<{ time: string; parts: Record<string, number>; total: number }> = [];
    for (let at = first; at < end; at += bucketMs) {
      const parts = counts.get(at) ?? {};
      result.push({ time: new Date(at).toISOString(), parts, total: Object.values(parts).reduce((sum, value) => sum + value, 0) });
    }
    return result;
  }, [page]);
  const maximum = Math.max(1, ...buckets.map((bucket) => bucket.total));

  function indexAt(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(buckets.length - 1, Math.floor((event.clientX - rect.left) / rect.width * buckets.length)));
  }

  function finishZoom(event: PointerEvent<HTMLDivElement>) {
    if (!selection || !page || buckets.length === 0) return;
    const last = indexAt(event);
    if (last !== selection.start) {
      const firstIndex = Math.min(selection.start, last);
      const lastIndex = Math.max(selection.start, last);
      const from = new Date(Math.max(Date.parse(page.from), Date.parse(buckets[firstIndex].time))).toISOString();
      const to = new Date(Math.min(Date.parse(page.to), Date.parse(buckets[lastIndex].time) + page.bucketSeconds * 1000)).toISOString();
      if (Date.parse(from) < Date.parse(to)) onZoom(from, to);
    }
    setSelection(null);
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-900">Event volume by received time</h2>
    <p className="mt-1 text-xs text-slate-500">Drag across bars to zoom. Severity comes from the sender.</p>
    {!page ? <p className="py-10 text-center text-sm text-slate-500">Loading event volume...</p> : buckets.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No time buckets in this range.</p> : <>
      <div className="mt-4 flex gap-2">
        <div aria-hidden="true" className="flex h-40 w-8 shrink-0 flex-col justify-between text-right text-[10px] text-slate-500"><span>{maximum}</span><span>{Math.round(maximum / 2)}</span><span>0</span></div>
        <div className="min-w-0 flex-1">
          <div
            className="relative h-40 cursor-crosshair select-none touch-none border-b border-l border-slate-300"
            role="img"
            aria-label={`Event count histogram with ${buckets.length} time buckets. Maximum ${maximum} events.`}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const index = indexAt(event); setSelection({ start: index, end: index }); }}
            onPointerMove={(event) => { if (selection) setSelection({ ...selection, end: indexAt(event) }); }}
            onPointerUp={finishZoom}
            onPointerCancel={() => setSelection(null)}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
            <div className="absolute inset-0 flex items-end gap-px p-px">
              {buckets.map((bucket) => <div key={bucket.time} title={`${bangkok(bucket.time)} · ${bucket.total} records`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                {bucket.total === 0 ? <span className="h-px w-full bg-slate-200" /> : levels.map((level) => bucket.parts[level] ? <span key={level} className={`block w-full ${colors[level]}`} style={{ height: `${bucket.parts[level] / maximum * 100}%` }} /> : null)}
              </div>)}
            </div>
            {selection && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-2 border-dashed border-blue-500 bg-blue-300/25" style={{ left: `${Math.min(selection.start, selection.end) / buckets.length * 100}%`, width: `${(Math.abs(selection.end - selection.start) + 1) / buckets.length * 100}%` }} />}
          </div>
          <div aria-hidden="true" className="mt-1 flex justify-between gap-2 text-[10px] text-slate-500"><span>{bangkok(buckets[0].time)}</span><span>{bangkok(buckets[Math.floor(buckets.length / 2)].time)}</span><span>{bangkok(buckets[buckets.length - 1].time)}</span></div>
        </div>
      </div>
      <p className="mt-1 pl-10 text-xs text-slate-500">Count / hits · Received time (Bangkok) · {page.bucketSeconds}s per bucket</p>
      {page.total === 0 && <p className="mt-2 text-center text-xs text-slate-500">No received records in this range.</p>}
    </>}
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">{levels.map((level) => <span key={level} className="inline-flex items-center gap-1"><span className={`size-2 rounded ${colors[level]}`} />{level}</span>)}</div>
  </section>;
}

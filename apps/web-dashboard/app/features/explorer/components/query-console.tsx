"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/app/features/projects/api";

const presets = [
  { label: "All Errors", query: "severity:ERROR" },
  { label: "HTTP Failures", query: "status_code >= 400" },
  { label: "High Latency", query: "duration_ms > 1000" },
];

export function QueryConsole({ projects, projectId, time, query, autoRefresh, loading, onProject, onTime, onQuery, onRefresh, onAutoRefresh }: {
  projects: Project[]; projectId: string; time: string; query: string; autoRefresh: boolean; loading: boolean;
  onProject: (id: string) => void; onTime: (time: string) => void; onQuery: (query: string) => void;
  onRefresh: () => void; onAutoRefresh: (enabled: boolean) => void;
}) {
  const [draft, setDraft] = useState(query);
  const [focused, setFocused] = useState(false);
  const lastWord = draft.split(/\s+/).at(-1) ?? "";
  const suggestions = focused && lastWord && !lastWord.includes(":") ? ["source:", "event_type:", "severity:"].filter((key) => key.startsWith(lastWord.toLowerCase())) : [];
  function submit(event: FormEvent) { event.preventDefault(); onQuery(draft.trim()); if (draft.trim() === query) onRefresh(); }
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <div><label htmlFor="explorer-project" className="mb-1 block text-xs font-medium text-slate-600">Project</label><select id="explorer-project" value={projectId} onChange={(event) => onProject(event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Choose project</option>{projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.name}</option>)}</select></div>
      <div><label htmlFor="explorer-time" className="mb-1 block text-xs font-medium text-slate-600">Received time</label><select id="explorer-time" value={["15m", "1h", "24h", "7d"].includes(time) ? time : "custom"} onChange={(event) => onTime(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="15m">Last 15 min</option><option value="1h">Last hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option>{!["15m", "1h", "24h", "7d"].includes(time) && <option value="custom" disabled>Zoomed range</option>}</select></div>
      <label className="flex h-9 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={autoRefresh} onChange={(event) => onAutoRefresh(event.target.checked)} />Auto refresh</label>
    </div>
    <form onSubmit={submit} className="mt-4 flex gap-2"><div className="relative min-w-0 flex-1"><label htmlFor="explorer-query" className="mb-1 block text-xs font-medium text-slate-600">Search records</label><Input id="explorer-query" value={draft} onChange={(event) => setDraft(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="source:payments severity:ERROR status_code>=400 or message text" autoComplete="off" />{suggestions.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white p-1 shadow-md">{suggestions.map((key) => <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setDraft(`${draft.slice(0, draft.length - lastWord.length)}${key}`)} className="block w-full rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-blue-50">{key}</button>)}</div>}</div><Button type="submit" disabled={!projectId || loading} className="mt-5 bg-blue-600 text-white hover:bg-blue-700">{loading ? "Loading..." : "Search"}</Button></form>
    <div className="mt-3 flex flex-wrap gap-2">{presets.map((preset) => <button key={preset.label} type="button" onClick={() => onQuery([query, preset.query].filter(Boolean).join(" "))} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100">{preset.label}</button>)}</div>
    <p className="mt-2 text-xs text-slate-500">Filters: source:, event_type:, severity:, status_code comparisons, duration_ms comparisons, and message words.</p>
  </section>;
}

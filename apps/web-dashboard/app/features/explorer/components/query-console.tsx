"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/app/features/projects/api";
import { splitQueryWords } from "../query";

const presets = [
  { label: "All Errors", query: "severity:ERROR" },
  { label: "HTTP Failures", query: "status_code >= 400" },
  { label: "High Latency", query: "duration_ms > 1000" },
];

function queryChips(query: string): string[] {
  const words = splitQueryWords(query);
  const chips: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    if (words[index] === "NOT" && words[index + 1]) {
      chips.push(`NOT ${words[++index]}`);
    } else if (/^(status_code|duration_ms)$/i.test(words[index]) && /^(>=|<=|=|>|<)$/.test(words[index + 1] ?? "") && /^\d/.test(words[index + 2] ?? "")) {
      chips.push(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
      index += 2;
    } else {
      chips.push(words[index]);
    }
  }
  return chips;
}

export function QueryConsole({ projects, projectId, time, query, initialDraft, autoRefresh, loading, onProject, onTime, onResetZoom, onQuery, onRefresh, onAutoRefresh }: {
  projects: Project[]; projectId: string; time: string; query: string; initialDraft: string; autoRefresh: boolean; loading: boolean;
  onProject: (id: string) => void; onTime: (time: string) => void; onResetZoom: () => void; onQuery: (query: string) => void;
  onRefresh: () => void; onAutoRefresh: (enabled: boolean) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [focused, setFocused] = useState(false);
  const chips = queryChips(query);
  const lastWord = splitQueryWords(draft).at(-1) ?? "";
  const suggestions = focused && lastWord && !lastWord.includes(":") ? ["source:", "event_type:", "severity:"].filter((key) => key.startsWith(lastWord.toLowerCase())) : [];
  function submit(event: FormEvent) { event.preventDefault(); onQuery(draft.trim()); if (draft.trim() === query) onRefresh(); }

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <div><label htmlFor="explorer-project" className="mb-1 block text-xs font-medium text-slate-600">Project</label><select id="explorer-project" value={projectId} onChange={(event) => onProject(event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Choose project</option>{projects.map((item) => <option key={item.projectId} value={item.projectId}>{item.name}</option>)}</select></div>
      <div><label htmlFor="explorer-time" className="mb-1 block text-xs font-medium text-slate-600">Received time</label><div className="flex items-center gap-2"><select id="explorer-time" value={["15m", "1h", "24h", "7d"].includes(time) ? time : "custom"} onChange={(event) => onTime(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="15m">Last 15 min</option><option value="1h">Last hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option>{!["15m", "1h", "24h", "7d"].includes(time) && <option value="custom" disabled>Zoomed range</option>}</select>{!["15m", "1h", "24h", "7d"].includes(time) && <Button type="button" size="sm" variant="outline" onClick={onResetZoom}>↺ Reset zoom</Button>}</div></div>
      <label className="flex h-9 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={autoRefresh} onChange={(event) => onAutoRefresh(event.target.checked)} />Auto refresh</label>
    </div>
    <form onSubmit={submit} className="mt-4 flex gap-2"><div className="relative min-w-0 flex-1"><label htmlFor="explorer-query" className="mb-1 block text-xs font-medium text-slate-600">Search records</label><Input id="explorer-query" value={draft} onChange={(event) => setDraft(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="source:payments severity:ERROR status_code>=400 or message text" autoComplete="off" autoFocus={initialDraft !== query} className="pr-9" />{draft && <button type="button" aria-label="Clear search" title="Clear search" onClick={() => { setDraft(""); onQuery(""); }} className="absolute right-2 top-7 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-4" /></button>}{suggestions.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white p-1 shadow-md">{suggestions.map((key) => <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setDraft(`${draft.slice(0, draft.length - lastWord.length)}${key}`)} className="block w-full rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-blue-50">{key}</button>)}</div>}</div><Button type="submit" disabled={!projectId || loading} className="mt-5 bg-blue-600 text-white hover:bg-blue-700">{loading ? "Loading..." : "Search"}</Button></form>
    {chips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active search filters">{chips.map((chip, index) => <button key={`${chip}-${index}`} type="button" aria-label={`Remove ${chip} filter`} onClick={() => onQuery(chips.filter((_, chipIndex) => chipIndex !== index).join(" "))} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">{chip} ×</button>)}<button type="button" onClick={() => onQuery("")} className="text-xs font-medium text-blue-700 hover:underline">Clear all filters</button></div>}
    <div className="mt-3 flex flex-wrap gap-2">{presets.map((preset) => <button key={preset.label} type="button" onClick={() => onQuery([query, preset.query].filter(Boolean).join(" "))} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100">{preset.label}</button>)}</div>
    <p className="mt-2 text-xs text-slate-500">Filters: source:, event_type:, severity:, status_code comparisons, duration_ms comparisons, payload.field:, and message words. Quote values containing spaces.</p>
  </section>;
}

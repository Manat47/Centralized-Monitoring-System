"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { projectApi, type LogEvent, type LogPage, type Project } from "@/app/features/projects/api";
import { EventHistogram } from "./components/event-histogram";
import { FieldFacets } from "./components/field-facets";
import { LogStreamTable } from "./components/log-stream-table";
import { QueryConsole } from "./components/query-console";
import { availableFields, DEFAULT_FIELD_IDS } from "./fields";
import { parseQuery, timeBounds } from "./query";

const message = (cause: unknown) => cause instanceof Error ? cause.message : "Could not load records";
const VISIBLE_FIELDS_KEY = "log_explorer_visible_fields";

export function ExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const time = searchParams.get("time") ?? "24h";
  const query = searchParams.get("q") ?? "";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectError, setProjectError] = useState("");
  const [page, setPage] = useState<LogPage | null>(null);
  const [records, setRecords] = useState<LogEvent[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELD_IDS);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(VISIBLE_FIELDS_KEY) ?? "null");
      if (Array.isArray(saved) && saved.every((field): field is string => typeof field === "string")) {
        const timer = window.setTimeout(() => setSelectedFields(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Invalid or unavailable storage keeps the documented default columns.
    }
  }, []);
  const [pendingField, setPendingField] = useState<{ prefix: string; id: number } | null>(null);
  const [zoomHistory, setZoomHistory] = useState<string[]>([]);

  const parsed = useMemo(() => {
    try { return { ...parseQuery(query), bounds: timeBounds(time), error: "" }; }
    catch (cause) { return { params: new URLSearchParams(), bounds: null, error: message(cause) }; }
  }, [query, time]);
  const viewKey = `${projectId}\n${time}\n${query}`;
  const visiblePage = loadedKey === viewKey ? page : null;

  const updateUrl = useCallback((changes: { projectId?: string; time?: string; q?: string }) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/explorer?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    let active = true;
    projectApi.list().then((items) => {
      if (!active) return;
      setProjects(items);
      const saved = window.localStorage.getItem("selected-log-project");
      if (items.length && !items.some((item) => item.projectId === projectId)) {
        const selected = items.find((item) => item.projectId === saved)?.projectId ?? items[0].projectId;
        window.localStorage.setItem("selected-log-project", selected);
        window.dispatchEvent(new Event("log-project-selected"));
        updateUrl({ projectId: selected });
      }
    }).catch((cause) => { if (active) setProjectError(message(cause)); });
    return () => { active = false; };
  }, [projectId, updateUrl]);

  useEffect(() => {
    if (!projectId || !projects.some((item) => item.projectId === projectId) || parsed.error || !parsed.bounds) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(parsed.params);
      params.set("limit", "100");
      params.set("from", parsed.bounds!.from);
      if (parsed.bounds!.to) params.set("to", parsed.bounds!.to);
      setLoading(true); setError("");
      projectApi.logs(projectId, params).then((result) => {
        if (!active) return;
        setPage(result); setRecords(result.items); setLoadedKey(viewKey);
      }).catch((cause) => { if (active) setError(message(cause)); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [projectId, projects, parsed, refreshCount, viewKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => setRefreshCount((count) => count + 1), 10_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  function selectProject(id: string) {
    window.localStorage.setItem("selected-log-project", id);
    window.dispatchEvent(new Event("log-project-selected"));
    setPage(null); setRecords([]);
    updateUrl({ projectId: id });
  }
  function toggleField(id: string) {
    setSelectedFields((current) => {
      const next = current.includes(id) ? current.filter((field) => field !== id) : [...current, id];
      try { window.localStorage.setItem(VISIBLE_FIELDS_KEY, JSON.stringify(next)); } catch { /* Storage can be disabled. */ }
      return next;
    });
  }
  function addFilter(field: string, value: string, exclude: boolean) {
    const searchableValue = /\s/.test(value) ? `"${value}"` : value;
    updateUrl({ q: [query, exclude ? "NOT" : "", `${field}:${searchableValue}`].filter(Boolean).join(" ") });
  }
  function submitQuery(next: string) {
    setPendingField(null);
    updateUrl({ q: next });
  }
  function zoom(from: string, to: string) {
    setZoomHistory((history) => [...history, time]);
    updateUrl({ time: `${from},${to}` });
  }
  function resetZoom() {
    const previous = zoomHistory.at(-1) ?? "24h";
    setZoomHistory((history) => history.slice(0, -1));
    updateUrl({ time: previous });
  }
  async function loadMore() {
    if (!visiblePage || visiblePage.nextOffset === null || !parsed.bounds || loading) return;
    const params = new URLSearchParams(parsed.params);
    params.set("limit", "100"); params.set("offset", String(visiblePage.nextOffset)); params.set("from", parsed.bounds.from);
    if (parsed.bounds.to) params.set("to", parsed.bounds.to);
    setLoading(true); setError("");
    try { const next = await projectApi.logs(projectId, params); setPage(next); setRecords((current) => [...current, ...next.items]); }
    catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }

  const visible = visiblePage ? records : [];
  const fields = useMemo(() => availableFields(visiblePage ? records : []), [visiblePage, records]);
  return <section className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Log & Events</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Log & Event Explorer</h1><p className="text-sm text-slate-500">Search customer-reported records by received time.</p></div><Link href={`/explorer/rules${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Rules & Findings</Link></header>
    <QueryConsole key={`${query}:${pendingField?.id ?? ""}`} projects={projects} projectId={projectId} time={time} query={query} initialDraft={pendingField ? [query, pendingField.prefix].filter(Boolean).join(" ") : query} autoRefresh={autoRefresh} loading={loading} onProject={selectProject} onTime={(next) => { setZoomHistory([]); updateUrl({ time: next }); }} onResetZoom={resetZoom} onQuery={submitQuery} onRefresh={() => setRefreshCount((count) => count + 1)} onAutoRefresh={setAutoRefresh} />
    {(projectError || parsed.error || error) && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{projectError || parsed.error || error}</p>}
    {projects.length === 0 && !projectError ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Choose or create a log project to explore records.</p> : <div className="grid gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]"><FieldFacets fields={fields} selected={selectedFields} onToggle={toggleField} onAddFilter={(prefix) => setPendingField((current) => ({ prefix, id: (current?.id ?? 0) + 1 }))} /><div className="min-w-0 space-y-4"><EventHistogram page={visiblePage} onZoom={zoom} /><LogStreamTable page={visiblePage} records={visible} fields={fields} selectedFields={selectedFields} loading={loading} onMore={() => void loadMore()} onFilter={addFilter} /></div></div>}
  </section>;
}

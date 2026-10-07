"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BellRing, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projectApi, type ActivityFinding, type ActivityRule, type ActivityRuleDraft, type FacetValue, type LogEvent } from "./api";

const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const failure = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";
const selectClass = "h-9 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
const sentenceClass = "flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800";
const commonStatuses = [200, 201, 202, 204, 301, 302, 400, 401, 403, 404, 408, 409, 418, 422, 429, 500, 502, 503, 504];

function findingGroupText(finding: ActivityFinding): string {
  return finding.groupBy === "project" ? "Whole project" : `${finding.groupBy}: ${finding.groupValue}`;
}

function matchesSample(record: LogEvent, draft: ActivityRuleDraft): boolean {
  if (record.event_type !== draft.eventType) return false;
  if (draft.sourceFilter && record.source !== draft.sourceFilter) return false;
  const values: Record<string, unknown> = { source: record.source, severity: record.severity, event_type: record.event_type, status_code: record.status_code, "client.ip": record.clientIp, user_id: record.user_id };
  return String(values[draft.conditionField] ?? "") === draft.conditionValue;
}

export function ActivityRulesPanel({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [findings, setFindings] = useState<ActivityFinding[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [eventTypes, setEventTypes] = useState<FacetValue[]>([]);
  const [sources, setSources] = useState<FacetValue[]>([]);
  const [statusCodes, setStatusCodes] = useState<FacetValue[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshingFindings, setRefreshingFindings] = useState(false);
  const findingRequestInFlight = useRef(false);
  const [preview, setPreview] = useState<{ matchingRecords: number; usableGroupRecords: number; signature: string; samples: string[] } | null>(null);
  const [draft, setDraft] = useState<ActivityRuleDraft>({ name: "", dataSource: "ACCEPTED_RECORDS", eventType: "", sourceFilter: null, conditionField: "severity", conditionValue: "", groupBy: "project", threshold: 5, windowMinutes: 10 });

  const refreshAll = useCallback(async () => {
    const [nextRules, nextFindings, logs] = await Promise.all([
      projectApi.activityRules(projectId), projectApi.activityFindings(projectId),
      projectApi.logs(projectId, new URLSearchParams({ limit: "1" })),
    ]);
    setRules(nextRules); setFindings(nextFindings.items); setNextOffset(nextFindings.nextOffset);
    setEventTypes(logs.facets.eventTypes);
    setSources(logs.facets.sources);
    setStatusCodes(logs.facets.statusCodes);
  }, [projectId]);
  const refreshFindings = useCallback(async (manual = false) => {
    if (findingRequestInFlight.current) return;
    findingRequestInFlight.current = true;
    if (manual) setRefreshingFindings(true);
    try {
      const page = await projectApi.activityFindings(projectId);
      setFindings(page.items);
      setNextOffset(page.nextOffset);
      if (manual) setError("");
    } catch (cause) {
      if (manual) setError(failure(cause));
    } finally {
      findingRequestInFlight.current = false;
      if (manual) setRefreshingFindings(false);
    }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => { void refreshAll().catch((cause) => setError(failure(cause))); }, 0); return () => window.clearTimeout(timer); }, [refreshAll]);
  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") void refreshFindings(); };
    const timer = window.setInterval(poll, 15_000);
    document.addEventListener("visibilitychange", poll);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [refreshFindings]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await refreshAll(); }
    catch (cause) { setError(failure(cause)); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent) { event.preventDefault(); void run(() => projectApi.createActivityRule(projectId, draft)); }
  async function testRecentLogs() {
    setError("");
    try {
      const result = await projectApi.previewActivityRule(projectId, draft);
      const samples = draft.dataSource === "ACCEPTED_RECORDS"
        ? (await projectApi.logs(projectId, new URLSearchParams({ limit: "100" }))).items
            .filter((record) => matchesSample(record, draft))
            .slice(0, 3)
            .map((record) => record.message?.trim() || `${record.source}: ${record.event_type}`)
        : [];
      setPreview({ ...result, signature: JSON.stringify(draft), samples });
    } catch (cause) { setError(failure(cause)); }
  }
  const observed = eventTypes.find((item) => item.value === draft.eventType);
  const selectedSource = draft.sourceFilter ?? "";
  const statuses = [...new Set([...commonStatuses.map(String), ...statusCodes.map((item) => item.value)])].filter((value) => /^\d{3}$/.test(value)).sort((a, b) => Number(a) - Number(b));
  const groupedStatuses = [1, 2, 3, 4, 5].map((group) => ({ group, values: statuses.filter((value) => Number(value[0]) === group) }));
  const isStatusField = draft.conditionField === "status_code" || draft.conditionField === "http_status";

  return <div className="space-y-4">
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2"><Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><p className="text-xs text-slate-500">Enabled detection rules</p><p className="text-2xl font-semibold">{rules.filter((rule) => rule.enabled).length}</p></CardContent></Card><Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><p className="text-xs text-slate-500">Findings</p><p className="text-2xl font-semibold">{findings.length}{nextOffset !== null ? "+" : ""}</p></CardContent></Card></div>
    {isOwner && <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Create detection rule</CardTitle><p className="text-sm text-slate-500">Choose what the rule observes. Log API requests are server-observed; accepted records contain customer-reported fields.</p></CardHeader><CardContent>
      <form onSubmit={create} className="space-y-3">
        <div className={sentenceClass}>
          <span>When</span>
          <Label htmlFor="rule-data-source" className="sr-only">Data source</Label>
          <select id="rule-data-source" value={draft.dataSource} onChange={(event) => {
            const dataSource = event.target.value as ActivityRuleDraft["dataSource"];
            setDraft({ ...draft, dataSource, sourceFilter: null, eventType: dataSource === "LOG_API_REQUESTS" ? "log_api.request" : "", conditionField: dataSource === "LOG_API_REQUESTS" ? "result" : "severity", conditionValue: "", groupBy: "project" });
          }} className={selectClass}>
            <option value="ACCEPTED_RECORDS">customer-reported log</option>
            <option value="LOG_API_REQUESTS">Log API request</option>
          </select>
          {draft.dataSource === "ACCEPTED_RECORDS" ? <>
            <span>received from source</span>
            <Label htmlFor="rule-source" className="sr-only">Reported source</Label>
            <select id="rule-source" value={selectedSource} onChange={(event) => setDraft({ ...draft, sourceFilter: event.target.value || null })} className={selectClass}>
              <option value="">Any source</option>
              {sources.map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}
            </select>
            <span>with event type</span>
            <Label htmlFor="rule-event" className="sr-only">Reported event type</Label>
            <Input id="rule-event" className="w-48 bg-white" list="observed-event-types" placeholder="e.g. provider_timeout" value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value })} maxLength={100} required />
            <datalist id="observed-event-types">{eventTypes.map((item) => <option key={item.value} value={item.value} />)}</datalist>
          </> : <span>is received</span>}
        </div>

        <div className={sentenceClass}>
          <span>Where field</span>
          <Label htmlFor="rule-field" className="sr-only">Condition field</Label>
          <select id="rule-field" value={draft.conditionField} onChange={(event) => setDraft({ ...draft, conditionField: event.target.value, conditionValue: "" })} className={selectClass}>
            {draft.dataSource === "LOG_API_REQUESTS" ? <><option value="result">API result</option><option value="http_status">HTTP status</option></> : <>
              <option value="severity">Severity</option><option value="event_type">Event type</option><option value="status_code">Status code</option><option value="client.ip">Reported client IP</option><option value="user_id">User ID</option>
            </>}
          </select>
          <span>is equal to</span>
          <Label htmlFor="rule-value" className="sr-only">Condition value</Label>
          {draft.conditionField === "severity" ? <select id="rule-value" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} required className={selectClass}><option value="">Select severity</option>{["INFO", "WARN", "ERROR", "CRITICAL"].map((value) => <option key={value} value={value}>{value}</option>)}</select> : isStatusField ? <select id="rule-value" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} required className={selectClass}><option value="">Select status</option>{draft.conditionField === "http_status" && <option value="any">Any status</option>}{groupedStatuses.map(({ group, values }) => values.length > 0 && <optgroup key={group} label={group + "xx HTTP status"}>{values.map((value) => <option key={value} value={value}>{value}</option>)}</optgroup>)}</select> : draft.conditionField === "result" ? <select id="rule-value" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} required className={selectClass}><option value="">Select result</option><option value="any">Any result</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select> : <Input id="rule-value" className="w-56 bg-white" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} maxLength={256} required />}
        </div>
        <p className="text-xs text-slate-500">Source is an optional filter. You can combine it with one field condition such as Severity.</p>

        <div className={sentenceClass}>
          <span>Trigger a finding if count is at least</span>
          <Label htmlFor="rule-count" className="sr-only">Minimum event count</Label>
          <Input id="rule-count" className="w-20 bg-white" type="number" min={2} max={1000} value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} required />
          <span>events within</span>
          <Label htmlFor="rule-window" className="sr-only">Window in minutes</Label>
          <Input id="rule-window" className="w-20 bg-white" type="number" min={1} max={60} value={draft.windowMinutes} onChange={(event) => setDraft({ ...draft, windowMinutes: Number(event.target.value) })} required />
          <span>minutes</span>
        </div>

        <div className={sentenceClass}>
          <span>Group by distinct</span>
          <Label htmlFor="rule-group" className="sr-only">Group by</Label>
          <select id="rule-group" value={draft.groupBy} onChange={(event) => setDraft({ ...draft, groupBy: event.target.value as ActivityRuleDraft["groupBy"] })} className={selectClass}>
            <option value="project">Whole project</option><option value="token_id">Sending token</option>
            {draft.dataSource === "ACCEPTED_RECORDS" && <><option value="client.ip">Client IP, if provided</option><option value="user_id">User ID, if provided</option></>}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2"><Label htmlFor="rule-name">Rule name</Label><Input id="rule-name" className="max-w-sm" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={100} required /></div>
        <p className="text-xs text-slate-500">{preview?.signature === JSON.stringify(draft) ? preview.matchingRecords + " recent items match the condition; " + preview.usableGroupRecords + " have the grouping field." : draft.dataSource === "LOG_API_REQUESTS" ? "Check recent Log API requests before saving." : observed ? observed.count + " records with this event type in the last 24 hours. Check the full condition before enabling." : "Waiting for data: this event type has not appeared in the last 24 hours."}</p>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void testRecentLogs()}>Test Rule against Sample Logs</Button><Button type="submit" disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving..." : "Create rule"}</Button></div>
        {preview?.signature === JSON.stringify(draft) && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><p className="font-medium">Latest matching samples</p>{preview.samples.length ? <ul className="mt-2 space-y-1 font-mono">{preview.samples.map((sample, index) => <li key={index} className="truncate" title={sample}>{sample}</li>)}</ul> : <p className="mt-1 text-slate-500">{draft.dataSource === "LOG_API_REQUESTS" ? "The current API returns match counts for request logs, but not sample lines." : "No matching lines in the latest 100 accepted records."}</p>}</div>}
      </form>
      <p className="mt-3 text-xs text-slate-500">Enabled means listening for new data. Accepted-record rules count only records whose event timestamp is within 5 minutes of receive time and were received after the rule was enabled. Older records stay searchable but do not trigger a finding. Each group produces at most one finding per window. A record rule never verifies events inside the sender application.</p>
    </CardContent></Card>}
    <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Detection rules</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100 p-0">{rules.length === 0 ? <p className="p-4 text-sm text-slate-500">No rules configured.</p> : rules.map((rule) => <div key={rule.ruleId} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{rule.name}</strong><Badge variant="outline">{rule.enabled ? "Enabled" : "Disabled"}</Badge>{rule.waitingForData && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Waiting for data</Badge>}</div><p className="mt-1 text-xs text-slate-600">{rule.dataSource === "LOG_API_REQUESTS" ? "Server-observed Log API requests" : "Customer-reported accepted records"} · {rule.sourceFilter ? `source = ${rule.sourceFilter} · ` : ""}{rule.conditionField} = {rule.conditionValue}{rule.dataSource === "ACCEPTED_RECORDS" ? ` · ${rule.eventType}` : ""}</p><p className="mt-1 text-xs text-slate-500">{rule.threshold} items in {rule.windowMinutes} min · group: {rule.groupBy} · {rule.sampleCount ?? 0} recent matches</p></div>{isOwner && <button type="button" role="switch" aria-checked={rule.enabled} aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`} disabled={busy} onClick={() => void run(() => projectApi.setActivityRuleEnabled(projectId, rule.ruleId, !rule.enabled))} className="inline-flex items-center gap-2 text-xs font-medium disabled:opacity-50"><span className={`relative h-5 w-9 rounded-full transition-colors ${rule.enabled ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${rule.enabled ? "translate-x-4" : ""}`} /></span><span className={rule.enabled ? "text-emerald-700" : "text-slate-500"}>{rule.enabled ? "Active" : "Disabled"}</span></button>}</div>)}</CardContent></Card>
    <Card className="border-slate-200 bg-white shadow-none"><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">Findings</CardTitle><p className="mt-1 text-sm text-slate-500">Each finding identifies the data source used by its rule. Updates every 15 seconds while this tab is visible.</p></div><Button type="button" variant="outline" disabled={refreshingFindings} onClick={() => void refreshFindings(true)}><RefreshCw className="mr-2 size-4" />{refreshingFindings ? "Refreshing..." : "Refresh Findings"}</Button></CardHeader><CardContent className="divide-y divide-slate-100 p-0">{findings.length === 0 ? <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><ShieldCheck className="size-4" />No rule matches recorded.</div> : findings.map((item) => <div key={item.findingId} className="flex gap-3 p-4"><BellRing className="mt-1 size-4 text-rose-600" /><div><strong className="text-sm">{item.ruleName}</strong><p className="text-xs text-slate-600">{item.dataSource === "LOG_API_REQUESTS" ? "Server-observed Log API requests" : "Customer-reported accepted records"} · {item.sourceFilter ? `source = ${item.sourceFilter} · ` : ""}{item.conditionField} = {item.conditionValue}</p><p className="text-xs text-slate-600">{item.matchedCount} items · {findingGroupText(item)}</p><p className="text-xs text-slate-500">{bangkok(item.windowStart)} to {bangkok(item.triggeredAt)}</p></div></div>)}{nextOffset !== null && <div className="p-3 text-center"><Button type="button" size="sm" variant="outline" onClick={() => void projectApi.activityFindings(projectId, new URLSearchParams({ offset: String(nextOffset) })).then((result) => { setFindings((current) => [...current, ...result.items]); setNextOffset(result.nextOffset); }).catch((cause) => setError(failure(cause)))}>Load more</Button></div>}</CardContent></Card>
  </div>;
}

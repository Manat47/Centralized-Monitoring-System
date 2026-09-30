"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BellRing, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projectApi, type ActivityFinding, type ActivityRule, type ActivityRuleDraft, type FacetValue } from "./api";

const bangkok = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const failure = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";

export function ActivityRulesPanel({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [findings, setFindings] = useState<ActivityFinding[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [eventTypes, setEventTypes] = useState<FacetValue[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ matchingRecords: number; usableGroupRecords: number; signature: string } | null>(null);
  const [draft, setDraft] = useState<ActivityRuleDraft>({ name: "", dataSource: "ACCEPTED_RECORDS", eventType: "", conditionField: "severity", conditionValue: "", groupBy: "project", threshold: 5, windowMinutes: 10 });

  const refresh = useCallback(async () => {
    const [nextRules, nextFindings, logs] = await Promise.all([
      projectApi.activityRules(projectId), projectApi.activityFindings(projectId),
      projectApi.logs(projectId, new URLSearchParams({ limit: "1" })),
    ]);
    setRules(nextRules); setFindings(nextFindings.items); setNextOffset(nextFindings.nextOffset);
    setEventTypes(logs.facets.eventTypes);
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh().catch((cause) => setError(failure(cause))); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await refresh(); }
    catch (cause) { setError(failure(cause)); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent) { event.preventDefault(); void run(() => projectApi.createActivityRule(projectId, draft)); }
  const observed = eventTypes.find((item) => item.value === draft.eventType);

  return <div className="space-y-4">
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2"><Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><p className="text-xs text-slate-500">Enabled record rules</p><p className="text-2xl font-semibold">{rules.filter((rule) => rule.enabled).length}</p></CardContent></Card><Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><p className="text-xs text-slate-500">Findings from customer-reported records</p><p className="text-2xl font-semibold">{findings.length}{nextOffset !== null ? "+" : ""}</p></CardContent></Card></div>
    {isOwner && <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Create detection rule</CardTitle><p className="text-sm text-slate-500">Choose what the rule observes. Log API requests are server-observed; accepted records contain customer-reported fields.</p></CardHeader><CardContent>
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-1"><Label htmlFor="rule-source">Data source</Label><select id="rule-source" value={draft.dataSource} onChange={(event) => setDraft({ ...draft, dataSource: event.target.value as ActivityRuleDraft["dataSource"], eventType: event.target.value === "LOG_API_REQUESTS" ? "log_api.request" : "", conditionField: event.target.value === "LOG_API_REQUESTS" ? "result" : "severity", conditionValue: "", groupBy: "project" })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="ACCEPTED_RECORDS">Accepted records (customer reported)</option><option value="LOG_API_REQUESTS">Log API requests (server observed)</option></select></div>
        <div className="space-y-1"><Label htmlFor="rule-name">Rule name</Label><Input id="rule-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={100} required /></div>
        {draft.dataSource === "ACCEPTED_RECORDS" && <div className="space-y-1"><Label htmlFor="rule-event">Reported event type</Label><Input id="rule-event" list="observed-event-types" value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value })} maxLength={100} required /><datalist id="observed-event-types">{eventTypes.map((item) => <option key={item.value} value={item.value} />)}</datalist></div>}
        <div className="space-y-1"><Label htmlFor="rule-field">Condition field</Label><select id="rule-field" value={draft.conditionField} onChange={(event) => setDraft({ ...draft, conditionField: event.target.value, conditionValue: "" })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm">{draft.dataSource === "LOG_API_REQUESTS" ? <><option value="result">API result</option><option value="http_status">HTTP status</option></> : <><option value="severity">Severity</option><option value="source">Source</option><option value="event_type">Event type</option><option value="status_code">Status code</option><option value="client.ip">Client IP</option><option value="user_id">User ID</option></>}</select></div>
        <div className="space-y-1"><Label htmlFor="rule-value">Equals</Label><Input id="rule-value" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} maxLength={256} required /></div>
        <div className="space-y-1"><Label htmlFor="rule-group">Group by</Label><select id="rule-group" value={draft.groupBy} onChange={(event) => setDraft({ ...draft, groupBy: event.target.value as ActivityRuleDraft["groupBy"] })} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="project">Whole project</option><option value="token_id">Sending token</option>{draft.dataSource === "ACCEPTED_RECORDS" && <><option value="client.ip">Client IP, if provided</option><option value="user_id">User ID, if provided</option></>}</select></div>
        <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label htmlFor="rule-count">Minimum records</Label><Input id="rule-count" type="number" min={2} max={1000} value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} /></div><div className="space-y-1"><Label htmlFor="rule-window">Window (minutes)</Label><Input id="rule-window" type="number" min={1} max={60} value={draft.windowMinutes} onChange={(event) => setDraft({ ...draft, windowMinutes: Number(event.target.value) })} /></div></div>
        <div className="xl:col-span-3"><p className="mb-2 text-xs text-slate-500">{preview?.signature === JSON.stringify(draft) ? `${preview.matchingRecords} recent items match the condition; ${preview.usableGroupRecords} have the grouping field.` : draft.dataSource === "LOG_API_REQUESTS" ? "Check recent Log API requests before saving. Use result = accepted/rejected/any, or HTTP status such as 429." : observed ? `${observed.count} records with this event type in the last 24 hours. Check the full condition before enabling.` : "Waiting for data: this event type has not appeared in the last 24 hours."}</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void projectApi.previewActivityRule(projectId, draft).then((result) => setPreview({ ...result, signature: JSON.stringify(draft) })).catch((cause) => setError(failure(cause)))}>Check recent data</Button><Button type="submit" disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving..." : "Create rule"}</Button></div></div>
      </form><p className="mt-3 text-xs text-slate-500">Enabled means listening for new data. Each group produces at most one finding per window. A record rule never verifies events inside the sender application.</p>
    </CardContent></Card>}
    <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Detection rules</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100 p-0">{rules.length === 0 ? <p className="p-4 text-sm text-slate-500">No rules configured.</p> : rules.map((rule) => <div key={rule.ruleId} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{rule.name}</strong><Badge variant="outline">{rule.enabled ? "Enabled" : "Disabled"}</Badge>{rule.waitingForData && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Waiting for data</Badge>}</div><p className="mt-1 text-xs text-slate-600">{rule.dataSource === "LOG_API_REQUESTS" ? "Server-observed Log API requests" : "Customer-reported accepted records"} · {rule.conditionField} = {rule.conditionValue}{rule.dataSource === "ACCEPTED_RECORDS" ? ` · ${rule.eventType}` : ""}</p><p className="mt-1 text-xs text-slate-500">{rule.threshold} items in {rule.windowMinutes} min · group: {rule.groupBy} · {rule.sampleCount ?? 0} recent matches</p></div>{isOwner && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => projectApi.setActivityRuleEnabled(projectId, rule.ruleId, !rule.enabled))}>{rule.enabled ? "Disable" : "Enable"}</Button>}</div>)}</CardContent></Card>
    <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base">Findings</CardTitle><p className="text-sm text-slate-500">Each finding identifies the data source used by its rule.</p></CardHeader><CardContent className="divide-y divide-slate-100 p-0">{findings.length === 0 ? <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><ShieldCheck className="size-4" />No rule matches recorded.</div> : findings.map((item) => <div key={item.findingId} className="flex gap-3 p-4"><BellRing className="mt-1 size-4 text-rose-600" /><div><strong className="text-sm">{item.ruleName}</strong><p className="text-xs text-slate-600">{item.dataSource === "LOG_API_REQUESTS" ? "Server-observed Log API requests" : "Customer-reported accepted records"} · {item.conditionField} = {item.conditionValue}</p><p className="text-xs text-slate-600">{item.matchedCount} items · {item.groupBy}: {item.groupValue}</p><p className="text-xs text-slate-500">{bangkok(item.windowStart)} to {bangkok(item.triggeredAt)}</p></div></div>)}{nextOffset !== null && <div className="p-3 text-center"><Button type="button" size="sm" variant="outline" onClick={() => void projectApi.activityFindings(projectId, new URLSearchParams({ offset: String(nextOffset) })).then((result) => { setFindings((current) => [...current, ...result.items]); setNextOffset(result.nextOffset); }).catch((cause) => setError(failure(cause)))}>Load more</Button></div>}</CardContent></Card>
  </div>;
}

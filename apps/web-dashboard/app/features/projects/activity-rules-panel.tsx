"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { projectApi, type ActivityFinding, type ActivityRule, type ActivityRuleDraft } from "./api";

const date = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
}).format(new Date(value));
const message = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";

export function ActivityRulesPanel({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [findings, setFindings] = useState<ActivityFinding[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ActivityRuleDraft>({
    name: "Failed logins", eventType: "auth.login", conditionField: "metadata.status",
    conditionValue: "failed", groupBy: "client.ip", threshold: 5, windowMinutes: 10,
  });

  const refresh = useCallback(async () => {
    const [loadedRules, loadedFindings] = await Promise.all([
      projectApi.activityRules(projectId), projectApi.activityFindings(projectId),
    ]);
    setRules(loadedRules); setFindings(loadedFindings.items); setNextOffset(loadedFindings.nextOffset);
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch((cause: unknown) => setError(message(cause))); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await refresh(); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => projectApi.createActivityRule(projectId, draft));
  }

  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {isOwner && <Card><CardHeader><CardTitle className="text-base">Create detection rule</CardTitle></CardHeader><CardContent>
      <form className="grid gap-3 md:grid-cols-3" onSubmit={create}>
        <Input aria-label="Rule name" placeholder="Rule name" value={draft.name} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        <Input aria-label="Event type" placeholder="Event type, e.g. auth.login" value={draft.eventType} maxLength={100} onChange={(event) => setDraft({ ...draft, eventType: event.target.value })} required />
        <select aria-label="Condition field" className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.conditionField} onChange={(event) => setDraft({ ...draft, conditionField: event.target.value })}>
          <option value="metadata.status">Outcome</option><option value="severity">Severity</option><option value="client.device_type">Device type</option><option value="client.ip">Client IP</option><option value="user_id">User ID</option>
        </select>
        <Input aria-label="Condition value" placeholder="Equals value" value={draft.conditionValue} maxLength={256} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} required />
        <select aria-label="Group by" className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.groupBy} onChange={(event) => setDraft({ ...draft, groupBy: event.target.value as ActivityRuleDraft["groupBy"] })}>
          <option value="client.ip">Group by client IP</option><option value="user_id">Group by user ID</option>
        </select>
        <div className="flex gap-2"><Input aria-label="Minimum events" type="number" min={2} max={1000} value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} /><Input aria-label="Window in minutes" type="number" min={1} max={60} value={draft.windowMinutes} onChange={(event) => setDraft({ ...draft, windowMinutes: Number(event.target.value) })} /></div>
        <Button type="submit" disabled={busy}>Create rule</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">Rules inspect new events only. Each group produces at most one finding per window.</p>
    </CardContent></Card>}
    <Card><CardHeader><CardTitle className="text-base">Detection rules</CardTitle></CardHeader><CardContent className="divide-y">
      {rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
      {rules.map((rule) => <div key={rule.ruleId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><strong>{rule.name}</strong><p className="text-muted-foreground">{rule.eventType} · {rule.conditionField} = {rule.conditionValue} · {rule.threshold} in {rule.windowMinutes} min · {rule.groupBy}</p></div>
        {isOwner ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => projectApi.setActivityRuleEnabled(projectId, rule.ruleId, !rule.enabled))}>{rule.enabled ? "Disable" : "Enable"}</Button> : <span>{rule.enabled ? "Enabled" : "Disabled"}</span>}</div>)}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Detected activity</CardTitle></CardHeader><CardContent className="divide-y">
      {findings.length === 0 && <p className="text-sm text-muted-foreground">No findings yet.</p>}
      {findings.map((item) => <div key={item.findingId} className="py-3 text-sm"><strong>{item.ruleName}</strong><p>{item.matchedCount} matching events for {item.groupValue}</p><p className="text-xs text-muted-foreground">{date(item.triggeredAt)}</p></div>)}
      {nextOffset !== null && <Button variant="outline" className="mt-3" onClick={() => void projectApi.activityFindings(projectId, new URLSearchParams({ offset: String(nextOffset) })).then((page) => { setFindings((current) => [...current, ...page.items]); setNextOffset(page.nextOffset); }).catch((cause: unknown) => setError(message(cause)))}>Load more</Button>}
    </CardContent></Card>
  </div>;
}

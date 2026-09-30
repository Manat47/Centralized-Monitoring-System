"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { projectApi, type ActivityInsights, type ActivityLogEvent } from "./api";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
}).format(new Date(value));
const message = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";

export function ActivityLogsPanel({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<ActivityLogEvent[]>([]);
  const [insights, setInsights] = useState<ActivityInsights | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<ActivityLogEvent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [ip, setIp] = useState("");
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState("");
  const [condition, setCondition] = useState("");
  const [tag, setTag] = useState("");
  const [duration, setDuration] = useState("24");

  const params = useCallback((offset = 0) => {
    const result = new URLSearchParams({ limit: "50", offset: String(offset) });
    const hours = Number(duration);
    result.set("from", new Date(Date.now() - (hours || 720) * 3600_000 + 60_000).toISOString());
    if (userId) result.set("user_id", userId);
    if (ip) result.set("ip", ip);
    if (eventType) result.set("event_type", eventType === "custom" ? customEventType : eventType);
    if (condition) result.set("condition", condition);
    if (tag) result.set("tag", tag);
    return result;
  }, [condition, customEventType, duration, eventType, ip, tag, userId]);

  const load = useCallback(async (offset = 0) => {
    setLoading(true); setError("");
    try {
      const query = params(offset);
      const [page, summary] = await Promise.all([
        projectApi.activityLogs(projectId, query),
        offset === 0 ? projectApi.activityInsights(projectId, params()) : Promise.resolve(null),
      ]);
      setLogs((current) => offset ? [...current, ...page.items] : page.items);
      setNextOffset(page.nextOffset);
      if (summary) setInsights(summary);
    } catch (cause) { setError(message(cause)); }
    finally { setLoading(false); }
  }, [params, projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(0); }, 0);
    return () => window.clearTimeout(timer);
    // Search is submitted explicitly; changing a filter must not discard the current result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const session = insights?.latestSession;
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader><CardTitle className="text-sm">Total logins</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{insights?.totalLogins ?? "—"}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Active days</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{insights?.activeDays ?? "—"}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Latest IP and device</CardTitle></CardHeader><CardContent className="text-sm">{insights?.latestClient ? <><strong>{insights.latestClient.ip ?? "Unknown IP"}</strong><p className="text-muted-foreground">{insights.latestClient.deviceType ?? "Unknown device"} · {formatDate(insights.latestClient.timestamp)}</p></> : "No client data"}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm">Latest session</CardTitle></CardHeader><CardContent className="text-sm">{session ? <><strong>{session.userId ?? session.sessionId}</strong><p className="text-muted-foreground">{session.activeDurationMs === null ? "Awaiting logout" : `${Math.round(session.activeDurationMs / 1000)} seconds`} · {formatDate(session.loginAt)}</p></> : "No session"}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Find activity logs</CardTitle></CardHeader><CardContent>
      <form className="grid gap-3 md:grid-cols-3" onSubmit={(event: FormEvent) => { event.preventDefault(); void load(0); }}>
        <Input aria-label="User ID" placeholder="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
        <Input aria-label="Client IP" placeholder="Client IP" value={ip} onChange={(event) => setIp(event.target.value)} />
        <Input aria-label="Tag" placeholder="Tag" value={tag} onChange={(event) => setTag(event.target.value)} />
        <select aria-label="Event type" className="h-9 rounded-md border bg-background px-3 text-sm" value={eventType} onChange={(event) => setEventType(event.target.value)}>
          <option value="">All events</option><option value="auth.login">Login</option><option value="auth.logout">Logout</option><option value="auth.password_reset">Password reset</option><option value="custom">Other event</option>
        </select>
        {eventType === "custom" && <Input aria-label="Custom event type" placeholder="Event type" value={customEventType} onChange={(event) => setCustomEventType(event.target.value)} required />}
        <select aria-label="Condition" className="h-9 rounded-md border bg-background px-3 text-sm" value={condition} onChange={(event) => setCondition(event.target.value)}>
          <option value="">Any outcome</option><option value="success">Success</option><option value="failed">Failed</option>
        </select>
        <select aria-label="Duration" className="h-9 rounded-md border bg-background px-3 text-sm" value={duration} onChange={(event) => setDuration(event.target.value)}>
          <option value="1">Last hour</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="0">Last 30 days</option>
        </select>
        <Button type="submit" disabled={loading}><Search className="mr-2 size-4" />Search</Button>
      </form>
    </CardContent></Card>
    <Card><CardContent className="overflow-x-auto pt-6">
      <table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2">Time (Bangkok)</th><th className="p-2">User</th><th className="p-2">IP</th><th className="p-2">Event</th><th className="p-2">Outcome</th></tr></thead>
        <tbody>{logs.map((item) => <tr key={item.eventId} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setSelected(item)}>
          <td className="whitespace-nowrap p-2">{formatDate(item.timestamp)}</td><td className="p-2">{item.user_id ?? "—"}</td><td className="p-2">{item.client?.ip ?? "—"}</td><td className="p-2">{item.event_type}</td><td className="p-2">{String(item.metadata?.status ?? "—")}</td>
        </tr>)}</tbody></table>
      {logs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No activity logs found.</p>}
      {nextOffset !== null && <Button variant="outline" className="mt-4" disabled={loading} onClick={() => void load(nextOffset)}>Load more</Button>}
    </CardContent></Card>
    {selected && <Card><CardHeader><CardTitle className="text-base">Activity details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
      <p>{selected.message}</p><p className="text-muted-foreground">Received {formatDate(selected.receivedAt)}</p>
      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(selected, null, 2)}</pre>
    </CardContent></Card>}
  </div>;
}

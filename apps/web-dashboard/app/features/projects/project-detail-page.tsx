"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { projectApi, type Activity, type LogEvent, type Member, type Project,
  type ProjectRole, type ProjectToken, type Usage } from "./api";

type Tab = "logs" | "tokens" | "members" | "activity";
const date = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
}).format(new Date(value));
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tokens, setTokens] = useState<ProjectToken[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("logs");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("VIEWER");
  const [newToken, setNewToken] = useState("");
  const endpoint = "https://YOUR_HOST/api/ingest/logs";
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [eventType, setEventType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<LogEvent | null>(null);

  const canManageTokens = project?.role === "OWNER" || project?.role === "MAINTAINER";
  const isOwner = project?.role === "OWNER";

  const refresh = useCallback(async () => {
    const p = await projectApi.get(projectId);
    setProject(p);
    const requests: Promise<unknown>[] = [
      projectApi.members(projectId).then(setMembers),
      projectApi.usage(projectId).then(setUsage),
      projectApi.activity(projectId).then(setActivity),
    ];
    if (p.role !== "VIEWER") requests.push(projectApi.tokens(projectId).then(setTokens));
    await Promise.all(requests);
  }, [projectId]);

  const loadLogs = useCallback(async (offset = 0) => {
    const params = new URLSearchParams({ offset: String(offset), limit: "50" });
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    if (eventType) params.set("event_type", eventType);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    const page = await projectApi.logs(projectId, params);
    setLogs((current) => offset ? [...current, ...page.items] : page.items);
    setNextOffset(page.nextOffset);
  }, [projectId, search, source, eventType, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh().catch((cause: unknown) => setError(errorText(cause)));
      projectApi.logs(projectId, new URLSearchParams({ limit: "50" }))
        .then((page) => { setLogs(page.items); setNextOffset(page.nextOffset); })
        .catch((cause: unknown) => setError(errorText(cause)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      projectApi.usage(projectId).then(setUsage).catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [projectId]);

  async function action(run: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await run(); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(async () => {
      const created = await projectApi.createToken(projectId, name);
      setNewToken(created.token);
      setName("");
    });
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(async () => {
      await projectApi.addMember(projectId, memberEmail, memberRole);
      setMemberEmail("");
    });
  }

  const sample = JSON.stringify({ source: "payment_gateway",
    event_type: "transaction_failed", message: "Gateway timeout from upstream",
    status_code: 500, metadata: { environment: "production" } }, null, 2);
  const secret = newToken || "YOUR_PROJECT_TOKEN";
  const snippets: Record<string, string> = {
    cURL: `curl -X POST '${endpoint}' -H 'Authorization: Bearer ${secret}' -H 'Content-Type: application/json' -d '${sample.replace(/\n/g, "")}'`,
    "Node.js": `await fetch('${endpoint}', {\n  method: 'POST',\n  headers: { Authorization: 'Bearer ${secret}', 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },\n  body: JSON.stringify(${sample.replace(/\n/g, "")})\n});`,
    Python: `import requests\nrequests.post('${endpoint}', headers={'Authorization': 'Bearer ${secret}'}, json=${sample.replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False')})`,
  };

  return <section className="space-y-6">
    <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Projects</Link>
    <div>
      <h1 className="text-2xl font-semibold">{project?.name ?? "Project"}</h1>
      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{projectId}</p>
      {project && <p className="mt-2 text-sm text-muted-foreground">Your role: {project.role}</p>}
    </div>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

    <div className="grid gap-4 sm:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Requests per minute</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-semibold">{usage?.requestsPerMinute ?? "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">Rolling 60 seconds · all requests with a valid token</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Accepted records this month</CardTitle></CardHeader>
        <CardContent><div className="text-3xl font-semibold">{usage?.acceptedRecords.toLocaleString() ?? "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">{usage?.month ?? "Current month"} · Asia/Bangkok · no quota enforced</p></CardContent></Card>
    </div>

    <div className="flex flex-wrap gap-2 border-b pb-2" role="tablist" aria-label="Project sections">
      {(["logs", "tokens", "members", "activity"] as const).filter((item) => item !== "tokens" || canManageTokens).map((item) =>
        <Button key={item} role="tab" aria-selected={tab === item} variant={tab === item ? "default" : "ghost"}
          onClick={() => setTab(item)} className="capitalize">{item === "logs" ? "Log Explorer" : item}</Button>)}
    </div>

    {tab === "logs" && <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">Find log events</CardTitle></CardHeader><CardContent>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void loadLogs(0).catch((cause: unknown) => setError(errorText(cause))); }}>
          <Input aria-label="Search message" placeholder="Search message" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input aria-label="Source" placeholder="Source" value={source} onChange={(event) => setSource(event.target.value)} />
          <Input aria-label="Event type" placeholder="Event type" value={eventType} onChange={(event) => setEventType(event.target.value)} />
          <label className="text-xs text-muted-foreground">From<Input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="text-xs text-muted-foreground">To<Input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <Button type="submit"><Search className="mr-2 size-4" />Search</Button>
        </form>
      </CardContent></Card>
      <Card><CardContent className="overflow-x-auto pt-6">
        <table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2">Time (Bangkok)</th><th className="p-2">Source</th><th className="p-2">Event type</th><th className="p-2">Message</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.eventId} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setSelected(log)}>
            <td className="whitespace-nowrap p-2">{date(log.timestamp)}</td><td className="p-2">{log.source}</td><td className="p-2">{log.event_type}</td><td className="max-w-[420px] truncate p-2">{log.message}</td>
          </tr>)}</tbody></table>
        {logs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No events found for this range.</p>}
        {nextOffset !== null && <Button variant="outline" className="mt-4" onClick={() => void loadLogs(nextOffset).catch((cause: unknown) => setError(errorText(cause)))}>Load more</Button>}
      </CardContent></Card>
      {selected && <Card><CardHeader><CardTitle className="text-base">Event details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
        <p className="break-all font-mono text-xs">{selected.eventId}</p><p>{selected.message}</p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(selected, null, 2)}</pre>
      </CardContent></Card>}
    </div>}

    {tab === "tokens" && canManageTokens && <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-base">API tokens</CardTitle></CardHeader><CardContent className="space-y-4">
        <form onSubmit={createToken} className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Token name" placeholder="Token name, e.g. production" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /><Button type="submit" disabled={busy}>Create token</Button></form>
        {newToken && <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3"><p className="text-sm font-medium">Copy this token now. It will not be shown again.</p>
          <code className="block break-all text-xs">{newToken}</code><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(newToken)}><Copy className="mr-2 size-3" />Copy token</Button></div>}
        <div className="divide-y">{tokens.map((token) => <div key={token.tokenId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><strong>{token.name}</strong><p className="font-mono text-xs text-muted-foreground">{token.prefix}… · {token.revokedAt ? "Revoked" : "Active"}</p><p className="text-xs text-muted-foreground">Created {date(token.createdAt)}{token.lastUsedAt ? ` · Last used ${date(token.lastUsedAt)}` : ""}</p></div>
          {!token.revokedAt && <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (window.confirm(`Revoke ${token.name}?`)) void action(() => projectApi.revokeToken(projectId, token.tokenId)); }}>Revoke</Button>}</div>)}</div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Send your first event</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Replace YOUR_HOST with your HTTPS domain. The project ID is derived from the token and must not appear in the request body. For retryable requests, reuse an Idempotency-Key only when retrying the same payload.</p>
        {Object.entries(snippets).map(([language, code]) => <div key={language}><div className="mb-2 flex items-center justify-between"><strong className="text-sm">{language}</strong><Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(code)}><Copy className="mr-2 size-3" />Copy</Button></div><pre className="overflow-x-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{code}</pre></div>)}
      </CardContent></Card>
    </div>}

    {tab === "members" && <Card><CardHeader><CardTitle className="text-base">Project members</CardTitle></CardHeader><CardContent className="space-y-4">
      {isOwner && <form onSubmit={addMember} className="flex flex-col gap-3 sm:flex-row"><Input type="email" aria-label="Member email" placeholder="Existing active user email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} required />
        <select aria-label="Member role" className="rounded-md border bg-background px-3 text-sm" value={memberRole} onChange={(event) => setMemberRole(event.target.value as ProjectRole)}><option value="VIEWER">VIEWER</option><option value="MAINTAINER">MAINTAINER</option></select><Button disabled={busy} type="submit">Add member</Button></form>}
      <div className="divide-y">{members.map((member) => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><strong>{member.email || member.userId}</strong><p className="text-xs text-muted-foreground">{member.userId}</p></div>
        {isOwner && member.role !== "OWNER" ? <div className="flex gap-2"><select aria-label={`Role for ${member.email}`} className="rounded-md border bg-background px-2 text-sm" value={member.role} disabled={busy} onChange={(event) => void action(() => projectApi.setMemberRole(projectId, member.userId, event.target.value as ProjectRole))}><option value="VIEWER">VIEWER</option><option value="MAINTAINER">MAINTAINER</option></select><Button size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Remove ${member.email}?`)) void action(() => projectApi.removeMember(projectId, member.userId)); }}>Remove</Button></div> : <span>{member.role}</span>}</div>)}</div>
    </CardContent></Card>}

    {tab === "activity" && <Card><CardHeader><CardTitle className="text-base">Project activity</CardTitle></CardHeader><CardContent className="space-y-3">
      {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      {activity.map((item) => <div key={item.activityId} className="flex items-start gap-3 border-b py-2 text-sm"><ShieldCheck className="mt-0.5 size-4 text-muted-foreground" /><div><strong>{item.action.replaceAll("_", " ")}</strong><p className="text-xs text-muted-foreground">{date(item.occurredAt)} · Actor {item.actorUserId.slice(0, 8)}</p></div></div>)}
    </CardContent></Card>}
    <Button variant="ghost" size="sm" onClick={() => void refresh().catch((cause: unknown) => setError(errorText(cause)))}><RefreshCw className="mr-2 size-3" />Refresh project</Button>
  </section>;
}

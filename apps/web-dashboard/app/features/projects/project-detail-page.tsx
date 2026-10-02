"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Activity, ArrowLeft, CalendarDays, Copy, KeyRound, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { projectApi, type Member, type Project, type ProjectRole, type ProjectToken, type Usage } from "./api";
type Tab = "tokens" | "members";
const sections = [
  { id: "tokens", label: "Tokens", icon: KeyRound },
  { id: "members", label: "Members", icon: Users },
] as const;
const roleClass: Record<ProjectRole, string> = {
  OWNER: "border-blue-200 bg-blue-50 text-blue-700",
  MAINTAINER: "border-violet-200 bg-violet-50 text-violet-700",
  VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
};
const date = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
}).format(new Date(value));
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : "Request failed";

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tokens, setTokens] = useState<ProjectToken[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [tab, setTab] = useState<Tab>("tokens");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("VIEWER");
  const [newToken, setNewToken] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<ProjectToken | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  const canManageTokens = project?.role === "OWNER" || project?.role === "MAINTAINER";
  const isOwner = project?.role === "OWNER";
  const visibleSections = sections.filter((item) => item.id !== "tokens" || canManageTokens);
  const selectedTab = canManageTokens ? tab : "members";

  const refresh = useCallback(async () => {
    const p = await projectApi.get(projectId);
    setProject(p);
    const requests: Promise<unknown>[] = [
      projectApi.members(projectId).then(setMembers),
      projectApi.usage(projectId).then(setUsage),
    ];
    if (p.role !== "VIEWER") requests.push(projectApi.tokens(projectId).then(setTokens));
    await Promise.all(requests);
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh().catch((cause: unknown) => setError(errorText(cause))).finally(() => setLoadingProject(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      projectApi.usage(projectId).then(setUsage).catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [projectId]);

  async function action(run: () => Promise<unknown>): Promise<boolean> {
    setBusy(true); setError("");
    try { await run(); await refresh(); return true; }
    catch (cause) { setError(errorText(cause)); return false; }
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

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); }
    catch { setError("Could not copy to clipboard"); }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const currentIndex = visibleSections.findIndex((item) => item.id === current);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % visibleSections.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + visibleSections.length) % visibleSections.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = visibleSections.length - 1;
    else return;
    event.preventDefault();
    const next = visibleSections[nextIndex].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const sample = JSON.stringify({ source: "payment_gateway", event_type: "provider_timeout", message: "Payment provider timed out", severity: "WARN", status_code: 504, context: { provider: "example", attempt: 2 } }, null, 2);
  const endpoint = "https://YOUR_HOST/api/ingest/logs";
  const secret = newToken || "YOUR_PROJECT_TOKEN";
  const snippets: Record<string, string> = {
    PowerShell: `$token = '${secret}'\n$body = @'\n${sample}\n'@\nInvoke-RestMethod -Uri '${endpoint}' -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $body`,
    cURL: `curl -X POST '${endpoint}' -H 'Authorization: Bearer ${secret}' -H 'Content-Type: application/json' -d '${sample.replace(/\n/g, "")}'`,
    "Node.js": `await fetch('${endpoint}', {\n  method: 'POST',\n  headers: { Authorization: 'Bearer ${secret}', 'Content-Type': 'application/json' },\n  body: JSON.stringify(${sample.replace(/\n/g, "")})\n});`,
  };
  const rpm = usage?.requestsPerMinute ?? 0;
  const limit = usage?.rateLimitRpm ?? 600;
  const utilization = Math.min(100, Math.round((rpm / limit) * 100));
  const rpmColor = rpm >= limit ? "bg-rose-500" : rpm >= limit * 0.8 ? "bg-amber-500" : "bg-blue-600";

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/projects" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-blue-700"><ArrowLeft className="size-3.5" />All projects</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-slate-950">{project?.name ?? (loadingProject ? "Loading project..." : "Project")}</h1>{project && <Badge variant="outline" className={roleClass[project.role]}>{project.role}</Badge>}</div>
        <p className="mt-1 break-all font-mono text-xs text-slate-500">{projectId}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Link href={`/explorer?projectId=${encodeURIComponent(projectId)}`} className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">Open in Explorer</Link><Button type="button" size="sm" variant="outline" disabled={busy} className="w-fit rounded-lg bg-white" onClick={() => void action(async () => { await refresh(); })}><RefreshCw className={`mr-2 size-3.5 ${busy ? "animate-spin" : ""}`} />Refresh usage</Button></div>
    </div>

    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between"><p className="text-xs font-medium text-slate-500">Requests per minute</p><div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Activity className="size-4" /></div></div>
        {loadingProject ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{rpm}<span className="ml-1 text-sm font-normal text-slate-500">/ {limit}</span></p>}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-[width] duration-300 ${rpmColor}`} style={{ width: `${utilization}%` }} /></div><p className="mt-2 text-xs text-slate-500">Rolling 60 seconds · excess requests receive HTTP 429</p>
      </CardContent></Card>
      <Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between"><p className="text-xs font-medium text-slate-500">Accepted records this month</p><div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><CalendarDays className="size-4" /></div></div>
        {loadingProject ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{usage?.acceptedRecords.toLocaleString() ?? "—"}</p>}
        <p className="mt-4 text-xs text-slate-500">{usage?.month ?? "Current month"} · Asia/Bangkok · no record quota</p>
      </CardContent></Card>
    </div>
    {usage?.recentRejections?.length ? <Card className="border-rose-200 bg-rose-50 shadow-none"><CardContent className="p-4"><p className="text-sm font-medium text-rose-800">Recent rejected Log API requests</p><p className="mt-1 text-xs text-rose-700">Only requests using a valid project token can be attributed to this project. Rejected payloads are not stored.</p><div className="mt-2 space-y-1">{usage.recentRejections.slice(0, 5).map((item, index) => <p key={`${item.at}-${index}`} className="text-xs text-rose-800">{date(item.at)} · HTTP {item.status} · {item.reason}</p>)}</div></CardContent></Card> : null}

    <div role="tablist" aria-label="Project sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-2">
      {visibleSections.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" id={`tab-${item.id}`} role="tab" aria-controls={`panel-${item.id}`} aria-selected={selectedTab === item.id} tabIndex={selectedTab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => onTabKeyDown(event, item.id)} className={selectedTab === item.id ? "inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500/50" : "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-colors duration-150 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500/50"}><Icon className="size-4" />{item.label}</button>; })}
    </div>

    <div role="tabpanel" id={`panel-${selectedTab}`} aria-labelledby={`tab-${selectedTab}`} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40">
      {selectedTab === "tokens" && canManageTokens && <div className="space-y-4"><Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base text-slate-950">API tokens</CardTitle><p className="text-sm text-slate-500">Tokens can send logs to this project. A token is shown only once when created.</p></CardHeader><CardContent className="space-y-4">
        <form onSubmit={createToken} aria-busy={busy} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="token-name">Token name</Label><Input id="token-name" placeholder="e.g. production" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} required /></div><Button type="submit" disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Creating..." : "Create token"}</Button></form>
        {newToken && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-medium text-amber-800">Copy this token now. It will not be shown again.</p><code className="mt-2 block break-all rounded bg-white p-2 text-xs text-slate-900">{newToken}</code><Button type="button" size="sm" variant="outline" className="mt-2 bg-white" onClick={() => void copy(newToken)}><Copy className="mr-2 size-3" />Copy token</Button></div>}
        {tokens.length === 0 ? <p className="border-t border-slate-100 py-6 text-center text-sm text-slate-500">No tokens yet. Create one to send logs.</p> : <div className="divide-y divide-slate-100">{tokens.map((token) => <div key={token.tokenId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{token.name}</strong><Badge variant="outline" className={token.revokedAt ? "border-slate-200 bg-slate-50 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{token.revokedAt ? "Revoked" : "Active"}</Badge></div><p className="mt-1 font-mono text-xs text-slate-500">{token.prefix}...</p><p className="mt-1 text-xs text-slate-500">Created {date(token.createdAt)}{token.lastUsedAt ? ` · Last used ${date(token.lastUsedAt)}` : ""}</p></div>{!token.revokedAt && <Button type="button" size="sm" variant="outline" disabled={busy} className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setPendingRevoke(token)}>Revoke</Button>}</div>)}</div>}
      </CardContent></Card>
      <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base text-slate-950">Send your first event</CardTitle><p className="text-sm text-slate-500">Use one token per sending system. All tokens in this project share the same records and RPM limit. Send non-empty source and event_type; other fields are optional. Replace YOUR_HOST with your HTTPS domain.</p></CardHeader><CardContent className="space-y-4">
        {Object.entries(snippets).map(([language, code]) => <div key={language}><div className="mb-2 flex items-center justify-between"><strong className="text-sm text-slate-900">{language}</strong><Button type="button" size="sm" variant="outline" onClick={() => void copy(code)}><Copy className="mr-2 size-3" />Copy</Button></div><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{code}</pre></div>)}
        <p className="text-xs text-slate-500">A 202 response means the queue accepted the batch. Use its batchId with GET /api/ingest/logs/receipts/&lt;batchId&gt; and the same Bearer token to check QUEUED, STORED, or FAILED. Invalid JSON or a missing required field rejects the whole batch with its record index. Custom fields remain visible in the inline JSON inspector but are not searchable yet.</p>
      </CardContent></Card></div>}
      {selectedTab === "members" && <Card className="border-slate-200 bg-white shadow-none"><CardHeader><CardTitle className="text-base text-slate-950">Project members</CardTitle><p className="text-sm text-slate-500">Owners manage membership. Maintainers manage tokens. Viewers can read logs and usage.</p></CardHeader><CardContent className="space-y-4">
        {isOwner && <form onSubmit={addMember} aria-busy={busy} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="member-email">Existing user email</Label><Input id="member-email" type="email" placeholder="name@example.com" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} required /></div><div className="space-y-1.5"><Label htmlFor="member-role">Role</Label><select id="member-role" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 sm:w-40" value={memberRole} onChange={(event) => setMemberRole(event.target.value as ProjectRole)}><option value="VIEWER">Viewer</option><option value="MAINTAINER">Maintainer</option></select></div><Button type="submit" disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving..." : "Add member"}</Button></form>}
        {members.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No members found.</p> : <div className="divide-y divide-slate-100">{members.map((member) => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><strong className="text-slate-900">{member.email || member.userId}</strong><p className="mt-1 break-all font-mono text-xs text-slate-500">{member.userId}</p></div><div className="flex items-center gap-2">{isOwner && member.role !== "OWNER" ? <><select aria-label={`Role for ${member.email}`} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40" value={member.role} disabled={busy} onChange={(event) => void action(() => projectApi.setMemberRole(projectId, member.userId, event.target.value as ProjectRole))}><option value="VIEWER">Viewer</option><option value="MAINTAINER">Maintainer</option></select><Button type="button" size="sm" variant="outline" disabled={busy} className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setPendingRemove(member)}>Remove</Button></> : <Badge variant="outline" className={roleClass[member.role]}>{member.role}</Badge>}</div></div>)}</div>}
      </CardContent></Card>}
    </div>

    <Dialog open={pendingRevoke !== null} onOpenChange={(open) => { if (!open) setPendingRevoke(null); }}><DialogContent><DialogHeader><DialogTitle>Revoke token?</DialogTitle><DialogDescription>“{pendingRevoke?.name}” will stop accepting new log requests immediately.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setPendingRevoke(null)}>Cancel</Button><Button type="button" disabled={busy} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { if (!pendingRevoke) return; void action(() => projectApi.revokeToken(projectId, pendingRevoke.tokenId)).then((ok) => { if (ok) setPendingRevoke(null); }); }}>Revoke token</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null); }}><DialogContent><DialogHeader><DialogTitle>Remove member?</DialogTitle><DialogDescription>“{pendingRemove?.email}” will lose access to this project.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setPendingRemove(null)}>Cancel</Button><Button type="button" disabled={busy} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { if (!pendingRemove) return; void action(() => projectApi.removeMember(projectId, pendingRemove.userId)).then((ok) => { if (ok) setPendingRemove(null); }); }}>Remove member</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

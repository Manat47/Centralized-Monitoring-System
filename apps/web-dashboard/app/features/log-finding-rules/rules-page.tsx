"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/app/features/auth/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateLogFindingRule, useDeleteLogFindingRule, useLogFindingRules, useUpdateLogFindingRule } from "./hooks";
import { RuleFormDialog } from "./rule-form-dialog";
import type { LogFindingRule, LogFindingRuleInput, LogFindingSeverity } from "./types";

const severityClasses: Record<LogFindingSeverity, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const triggeredFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function lastTriggeredLabel(value: string | null): string {
  if (!value) return "Never triggered";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Unknown" : triggeredFormatter.format(timestamp);
}

export function LogFindingRulesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const rulesQuery = useLogFindingRules();
  const createRule = useCreateLogFindingRule();
  const updateRule = useUpdateLogFindingRule();
  const deleteRule = useDeleteLogFindingRule();
  const [editing, setEditing] = useState<LogFindingRule | null | "create">(null);
  const [deleting, setDeleting] = useState<LogFindingRule | null>(null);
  const [error, setError] = useState("");
  const busy = createRule.isPending || updateRule.isPending || deleteRule.isPending;
  const rules = rulesQuery.data ?? [];
  const services = [...new Set(rules.map((rule) => rule.serviceName))].sort();

  async function save(input: LogFindingRuleInput) {
    if (editing === "create") await createRule.mutateAsync(input);
    else if (editing) await updateRule.mutateAsync({ id: editing.id, input });
    setEditing(null);
    setError("");
  }

  async function toggle(rule: LogFindingRule) {
    setError("");
    try { await updateRule.mutateAsync({ id: rule.id, input: { isEnabled: !rule.isEnabled } }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update rule."); }
  }

  async function remove() {
    if (!deleting) return;
    setError("");
    try { await deleteRule.mutateAsync(deleting.id); setDeleting(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete rule."); }
  }

  return <section className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Log & Events</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Log finding alerts</h1><p className="mt-1 text-sm text-slate-600">Detect repeated patterns in incoming logs across services. Rule changes reach the matcher within about 30 seconds.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void rulesQuery.refetch()} disabled={rulesQuery.isFetching}><RefreshCw className="size-4" />Refresh</Button>{isAdmin && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setEditing("create")}><Plus className="size-4" />Create rule</Button>}</div></header>
    <p className="text-sm text-slate-600">These alert rules are separate from <Link href="/explorer/rules" className="text-blue-700 underline">project activity rules and findings</Link>. Last triggered records a finding event, not every log evaluation.</p>
    {(error || rulesQuery.isError) && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error || (rulesQuery.error instanceof Error ? rulesQuery.error.message : "Could not load rules.")}</div>}
    <Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-0">
      {rulesQuery.isLoading ? <p className="p-6 text-sm text-slate-500">Loading finding rules...</p> : rulesQuery.isError ? <div className="p-6"><Button variant="outline" onClick={() => void rulesQuery.refetch()}>Try again</Button></div> : rules.length === 0 ? <div className="p-8 text-center"><p className="font-medium text-slate-900">No log finding rules yet</p><p className="mt-1 text-sm text-slate-500">Create a rule to watch for a keyword or regex pattern.</p>{isAdmin && <Button variant="outline" className="mt-4" onClick={() => setEditing("create")}>Create first rule</Button>}</div> : <Table>
        <TableHeader><TableRow>
          <TableHead>Rule</TableHead><TableHead>Service</TableHead><TableHead>Search query</TableHead>
          <TableHead>Severity</TableHead><TableHead>Threshold</TableHead><TableHead>Cooldown</TableHead>
          <TableHead>Last triggered</TableHead>
          <TableHead title="Distinct normalized message fingerprints that have triggered">Triggered patterns</TableHead>
          <TableHead>Enabled</TableHead>{isAdmin && <TableHead className="text-right">Actions</TableHead>}
        </TableRow></TableHeader>
        <TableBody>{rules.map((rule) => <TableRow key={rule.id}>
          <TableCell className="font-medium">{rule.name}</TableCell>
          <TableCell className="font-mono text-xs">{rule.serviceName === "*" ? "All services" : rule.serviceName}</TableCell>
          <TableCell className="max-w-64 truncate font-mono text-xs" title={rule.searchQuery}>{rule.searchQuery}</TableCell>
          <TableCell><Badge variant="outline" className={severityClasses[rule.severity]}>{rule.severity}</Badge></TableCell>
          <TableCell>{rule.threshold} in {rule.timeWindowSeconds}s</TableCell>
          <TableCell>{rule.cooldownMinutes}m</TableCell>
          <TableCell>{rule.lastTriggeredAt ? <time dateTime={rule.lastTriggeredAt}>{lastTriggeredLabel(rule.lastTriggeredAt)}</time> : "Never triggered"}</TableCell>
          <TableCell className="tabular-nums">{rule.triggeredFingerprintCount}</TableCell>
          <TableCell><label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" role="switch" aria-label={`${rule.isEnabled ? "Disable" : "Enable"} ${rule.name}`} checked={rule.isEnabled} disabled={!isAdmin || busy} onChange={() => void toggle(rule)} className="size-4 accent-blue-600" />{rule.isEnabled ? "Active" : "Disabled"}</label></TableCell>
          {isAdmin && <TableCell><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" aria-label={`Edit ${rule.name}`} disabled={busy} onClick={() => setEditing(rule)}><Pencil className="size-4" /></Button><Button size="icon-sm" variant="ghost" aria-label={`Delete ${rule.name}`} disabled={busy} onClick={() => { setError(""); setDeleting(rule); }}><Trash2 className="size-4 text-rose-600" /></Button></div></TableCell>}
        </TableRow>)}</TableBody>
      </Table>}
    </CardContent></Card>
    {editing && <RuleFormDialog key={editing === "create" ? "create" : editing.id} open rule={editing === "create" ? null : editing} services={services} busy={busy} onClose={() => setEditing(null)} onSave={save} />}
    <AlertDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next && !busy) setDeleting(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>This removes the rule and its stored cooldown states.</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? "Deleting..." : "Delete rule"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}

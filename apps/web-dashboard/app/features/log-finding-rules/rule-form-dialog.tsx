"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegexSandbox } from "./regex-sandbox";
import { previewLogFindingMatch } from "./match-preview";
import type { LogFindingRule, LogFindingRuleInput, LogFindingSeverity } from "./types";

const selectClass = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900";
const initial: LogFindingRuleInput = { name: "", serviceName: "*", searchQuery: "", severity: "medium", threshold: 3, timeWindowSeconds: 60, cooldownMinutes: 15, isEnabled: true };

export function RuleFormDialog({ open, rule, services, busy, onClose, onSave }: {
  open: boolean;
  rule: LogFindingRule | null;
  services: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: LogFindingRuleInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LogFindingRuleInput>(() => rule ? { name: rule.name, serviceName: rule.serviceName, searchQuery: rule.searchQuery, severity: rule.severity, threshold: rule.threshold, timeWindowSeconds: rule.timeWindowSeconds, cooldownMinutes: rule.cooldownMinutes, isEnabled: rule.isEnabled } : initial);
  const [customService, setCustomService] = useState(!["*", ...services].includes(draft.serviceName));
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const query = draft.searchQuery.trim();
    const serviceName = draft.serviceName.trim();
    if (!draft.name.trim() || !serviceName || !query) { setError("Name, service, and query are required."); return; }
    if (query.length > 256) { setError("Query must be 256 characters or less."); return; }
    if (query.startsWith("regex:")) {
      const validation = previewLogFindingMatch(query, "");
      if (validation.error) { setError(validation.error); return; }
    }
    if (![draft.threshold, draft.timeWindowSeconds, draft.cooldownMinutes].every((value) => Number.isInteger(value) && value >= 1)) {
      setError("Threshold, time window, and cooldown must be positive whole numbers."); return;
    }
    try { await onSave({ ...draft, name: draft.name.trim(), serviceName, searchQuery: query }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save rule."); }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{rule ? "Edit finding rule" : "Create finding rule"}</DialogTitle><DialogDescription>Match incoming logs by source and keyword or regex, then alert when the count reaches the threshold.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="finding-rule-name">Rule name</Label><Input id="finding-rule-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={160} required placeholder="Payment timeouts" /></div>
          <div className="space-y-1.5"><Label htmlFor="finding-rule-service">Service</Label><select id="finding-rule-service" className={selectClass} value={customService ? "__custom" : draft.serviceName} onChange={(event) => { const custom = event.target.value === "__custom"; setCustomService(custom); setDraft({ ...draft, serviceName: custom ? "" : event.target.value }); }}><option value="*">* (All services)</option>{services.filter((name) => name !== "*").map((name) => <option key={name} value={name}>{name}</option>)}<option value="__custom">Other service...</option></select>{customService && <Input aria-label="Custom service name" value={draft.serviceName} onChange={(event) => setDraft({ ...draft, serviceName: event.target.value })} maxLength={160} required placeholder="e.g. payment_gateway" />}</div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="finding-rule-query">Search query or regex</Label><Input id="finding-rule-query" value={draft.searchQuery} onChange={(event) => setDraft({ ...draft, searchQuery: event.target.value })} maxLength={256} required placeholder="timeout or regex:timeout|connection refused" /><p className="text-xs text-slate-500">Plain text is a case insensitive keyword. Prefix a regex with <code>regex:</code>.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="finding-rule-severity">Severity</Label><select id="finding-rule-severity" className={selectClass} value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as LogFindingSeverity })}>{(["low", "medium", "high", "critical"] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="finding-rule-threshold">Minimum matches</Label><Input id="finding-rule-threshold" type="number" min={1} max={100000} value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="finding-rule-window">Window (seconds)</Label><Input id="finding-rule-window" type="number" min={1} max={86400} value={draft.timeWindowSeconds} onChange={(event) => setDraft({ ...draft, timeWindowSeconds: Number(event.target.value) })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="finding-rule-cooldown">Cooldown (minutes)</Label><Input id="finding-rule-cooldown" type="number" min={1} max={10080} value={draft.cooldownMinutes} onChange={(event) => setDraft({ ...draft, cooldownMinutes: Number(event.target.value) })} required /></div>
        </div>
        <RegexSandbox query={draft.searchQuery} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => setDraft({ ...draft, isEnabled: event.target.checked })} className="size-4 accent-blue-600" />Enable rule after saving</label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy} className="bg-blue-600 text-white hover:bg-blue-700">{busy ? "Saving..." : rule ? "Save changes" : "Create rule"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { previewLogFindingMatch } from "./match-preview";

export function RegexSandbox({ query }: { query: string }) {
  const [sample, setSample] = useState("");
  const result = sample ? previewLogFindingMatch(query, sample) : null;

  return <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-semibold text-slate-900">Query tester</h3><p className="text-xs text-slate-500">Regex starts with <code>regex:</code>. Keyword matching ignores case. The engine checks message, event type, and status code together.</p></div>
      {result && <Badge variant="outline" className={result.error ? "border-rose-200 bg-rose-50 text-rose-700" : result.matches ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}>{result.error ? "Invalid query" : result.matches ? "Match" : "No match"}</Badge>}
    </div>
    <Label htmlFor="finding-rule-sample">Sample log text</Label>
    <textarea id="finding-rule-sample" value={sample} onChange={(event) => setSample(event.target.value)} maxLength={16_384} rows={4} placeholder="Example: connection refused while calling billing API" className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400" />
    {result?.error && <p role="alert" className="text-xs text-rose-700">{result.error}</p>}
    <p className="text-xs text-slate-500">Local preview only; it does not create a finding or send a notification.</p>
  </div>;
}

"use client";

import { useState, type ReactNode } from "react";
import type { LogEvent } from "@/app/features/projects/api";
import { Button } from "@/components/ui/button";
import { displayFieldValue } from "../fields";

function highlightedJson(value: unknown): ReactNode[] {
  const json = JSON.stringify(value, null, 2);
  const tokens = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
  const result: ReactNode[] = [];
  let previous = 0;
  for (const match of json.matchAll(tokens)) {
    const index = match.index;
    result.push(json.slice(previous, index));
    const token = match[0];
    const isKey = token.startsWith('"') && /^\s*:/.test(json.slice(index + token.length));
    result.push(<span key={index} className={isKey ? "text-sky-300" : token.startsWith('"') ? "text-emerald-300" : "text-amber-300"}>{token}</span>);
    previous = index + token.length;
  }
  result.push(json.slice(previous));
  return result;
}

export function InlineJsonInspector({ record, onFilter }: { record: LogEvent; onFilter: (field: string, value: string, exclude: boolean) => void }) {
  const [view, setView] = useState<"fields" | "json">("fields");
  const [copyError, setCopyError] = useState("");
  const envelope = { projectId: record.projectId, tokenId: record.tokenId, tokenName: record.tokenName, requestId: record.requestId, serverEventId: record.eventId, receivedAt: record.receivedAt, eventTime: record.timestamp, timeSource: record.timeSource, processingStatus: record.processingStatus };
  const indexed = { source: record.source, event_type: record.event_type, severity: record.severity };

  async function copy(value: unknown) {
    try { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); setCopyError(""); }
    catch { setCopyError("Could not copy JSON"); }
  }

  function fieldRows(entries: Array<[string, unknown]>, prefix: string | null) {
    return <div className="overflow-x-auto rounded-md border border-slate-200 bg-white"><table className="w-full min-w-[480px] text-left text-xs"><tbody className="divide-y divide-slate-100">{entries.map(([key, value]) => {
      const field = prefix === "payload" ? `payload.${key}` : key;
      const text = displayFieldValue(value);
      const canFilter = prefix !== null && /^[A-Za-z_][A-Za-z_0-9]*$/.test(key) && !/["\r\n]/.test(text) && text !== "—" && (typeof value === "string" || typeof value === "number" || typeof value === "boolean");
      return <tr key={key}><th scope="row" className="w-44 px-3 py-2 align-top font-medium text-slate-700">{key}</th><td className="max-w-0 break-all px-3 py-2 font-mono text-slate-600">{text}</td><td className="whitespace-nowrap px-3 py-2 text-right">{canFilter && <><button type="button" onClick={() => onFilter(field, text, false)} className="mr-2 text-blue-700 hover:underline">+ Filter</button><button type="button" onClick={() => onFilter(field, text, true)} className="text-blue-700 hover:underline">− Exclude</button></>}</td></tr>;
    })}</tbody></table></div>;
  }

  return <div className="space-y-4 bg-slate-50 p-4 text-sm">
    <div className="flex gap-2"><Button type="button" size="sm" variant={view === "fields" ? "default" : "outline"} aria-pressed={view === "fields"} onClick={() => setView("fields")}>Fields</Button><Button type="button" size="sm" variant={view === "json" ? "default" : "outline"} aria-pressed={view === "json"} onClick={() => setView("json")}>Raw JSON</Button></div>
    {view === "fields" ? <div className="space-y-4">
      <div><h3 className="mb-2 font-semibold">Server envelope</h3>{fieldRows(Object.entries(envelope), null)}</div>
      <div><h3 className="mb-2 font-semibold">Indexed fields</h3>{fieldRows(Object.entries(indexed), "indexed")}</div>
      <div><h3 className="mb-2 font-semibold">Original payload</h3>{fieldRows(Object.entries(record.rawPayload), "payload")}</div>
    </div> : <div className="grid gap-4 lg:grid-cols-2">
      <div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Server envelope</h3><Button type="button" size="sm" variant="outline" onClick={() => void copy(envelope)}>Copy JSON</Button></div><pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{highlightedJson(envelope)}</pre></div>
      <div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Original payload</h3><Button type="button" size="sm" variant="outline" onClick={() => void copy(record.rawPayload)}>Copy JSON</Button></div><pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{highlightedJson(record.rawPayload)}</pre></div>
    </div>}
    {copyError && <p role="alert" className="text-xs text-rose-700">{copyError}</p>}
  </div>;
}

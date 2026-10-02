"use client";

import { useState } from "react";
import type { LogEvent } from "@/app/features/projects/api";
import { Button } from "@/components/ui/button";

export function InlineJsonInspector({ record, onFilter }: { record: LogEvent; onFilter: (field: "source" | "event_type" | "severity", value: string, exclude: boolean) => void }) {
  const [copyError, setCopyError] = useState("");
  const envelope = { projectId: record.projectId, tokenId: record.tokenId, tokenName: record.tokenName, requestId: record.requestId, serverEventId: record.eventId, receivedAt: record.receivedAt, eventTime: record.timestamp, timeSource: record.timeSource, processingStatus: record.processingStatus };
  return <div className="space-y-4 bg-slate-50 p-4 text-sm">
    <div className="flex flex-wrap items-center gap-2">{(["source", "event_type", "severity"] as const).map((field) => record[field] && <div key={field} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1"><span className="text-xs text-slate-600">{field}: {record[field]}</span><button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => onFilter(field, record[field]!, false)}>+ Filter</button><button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => onFilter(field, record[field]!, true)}>− Exclude</button></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 font-semibold">Server envelope</h3><pre className="max-h-80 overflow-auto rounded-md bg-slate-200 p-3 text-xs">{JSON.stringify(envelope, null, 2)}</pre></div><div><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold">Original payload</h3><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(JSON.stringify(record.rawPayload, null, 2)).then(() => setCopyError("")).catch(() => setCopyError("Could not copy JSON"))}>Copy JSON</Button></div><pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(record.rawPayload, null, 2)}</pre>{copyError && <p role="alert" className="mt-1 text-xs text-rose-700">{copyError}</p>}</div></div>
  </div>;
}

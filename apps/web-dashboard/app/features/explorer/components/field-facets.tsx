"use client";

import { useState } from "react";
import type { ExplorerField } from "../fields";

export function FieldFacets({ fields, selected, onToggle, onAddFilter }: {
  fields: ExplorerField[];
  selected: string[];
  onToggle: (id: string) => void;
  onAddFilter: (prefix: string) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = fields.filter((field) => field.label.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedFields = visible.filter((field) => selected.includes(field.id));
  const available = visible.filter((field) => !selected.includes(field.id));

  function group(title: string, items: ExplorerField[]) {
    return <div>
      <h3 className="mb-1 text-xs font-semibold text-slate-600">{title} ({items.length})</h3>
      {items.length === 0 ? <p className="px-2 py-2 text-xs text-slate-400">No fields</p> : items.map((field) => (
        <div key={field.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50">
          <input
            type="checkbox"
            aria-label={`Show ${field.label} column`}
            checked={selected.includes(field.id)}
            onChange={() => onToggle(field.id)}
            className="accent-blue-600"
          />
          <span aria-hidden="true" className="w-3 font-mono font-semibold text-blue-700">{field.kind === "number" ? "#" : "t"}</span>
          <span className="min-w-0 flex-1 truncate" title={field.label}>{field.label}</span>
          {field.queryPrefix && <button type="button" title={`Add ${field.label} filter`} aria-label={`Add ${field.label} filter`} onClick={() => onAddFilter(field.queryPrefix!)} className="rounded px-1.5 text-base text-blue-700 hover:bg-blue-50">+</button>}
        </div>
      ))}
    </div>;
  }

  return <aside aria-label="Available fields" className="min-w-0 self-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
    <h2 className="text-sm font-semibold text-slate-900">Available fields</h2>
    <p className="mt-1 text-xs text-slate-500">Columns from standard fields and the first 100 loaded payloads.</p>
    <p className="mt-1 text-xs text-slate-500">Reported client IP comes from the sender&apos;s <code>client.ip</code> field. A dash means it was not supplied.</p>
    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find field..." aria-label="Find field" className="mt-3 h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
    <div className="mt-4 max-h-[38rem] space-y-4 overflow-y-auto">
      {group("Selected fields", selectedFields)}
      {group("Available fields", available)}
    </div>
  </aside>;
}

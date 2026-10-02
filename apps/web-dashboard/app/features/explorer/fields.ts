import type { LogEvent } from "@/app/features/projects/api";

export type ExplorerField = {
  id: string;
  label: string;
  kind: "number" | "text" | "other";
  queryPrefix?: string;
};

export const DEFAULT_FIELD_IDS = ["receivedAt", "severity", "clientIp", "event_type", "message"];

const standardFields: ExplorerField[] = [
  { id: "receivedAt", label: "Received (Bangkok)", kind: "text" },
  { id: "severity", label: "Severity", kind: "text", queryPrefix: "severity:" },
  { id: "clientIp", label: "Client IP", kind: "text", queryPrefix: "ip:" },
  { id: "event_type", label: "Event type", kind: "text", queryPrefix: "event_type:" },
  { id: "message", label: "Message / preview", kind: "text", queryPrefix: "message:" },
  { id: "source", label: "Source", kind: "text", queryPrefix: "source:" },
  { id: "status_code", label: "Status code", kind: "number", queryPrefix: "status_code=" },
  { id: "duration_ms", label: "Duration (ms)", kind: "number", queryPrefix: "duration_ms=" },
  { id: "user_id", label: "User ID", kind: "text", queryPrefix: "user_id:" },
  { id: "location", label: "Location", kind: "text", queryPrefix: "location:" },
  { id: "tags", label: "Tags", kind: "other", queryPrefix: "tag:" },
];

export function availableFields(records: LogEvent[]): ExplorerField[] {
  const payloadFields = new Map<string, ExplorerField>();
  for (const record of records.slice(0, 100)) {
    for (const [key, value] of Object.entries(record.rawPayload ?? {})) {
      if (payloadFields.has(key)) continue;
      payloadFields.set(key, {
        id: `payload:${key}`,
        label: `payload.${key}`,
        kind: typeof value === "number" ? "number" : typeof value === "string" ? "text" : "other",
        queryPrefix: /^[A-Za-z_][A-Za-z_0-9]*$/.test(key) ? `payload.${key}:` : undefined,
      });
    }
  }
  return [...standardFields, ...[...payloadFields.values()].sort((a, b) => a.label.localeCompare(b.label))];
}

export function fieldValue(record: LogEvent, fieldId: string): unknown {
  if (fieldId.startsWith("payload:")) return record.rawPayload?.[fieldId.slice(8)];
  if (fieldId === "receivedAt") return record.receivedAt;
  if (fieldId === "clientIp") return record.clientIp;
  if (fieldId === "tags") return record.tags;
  if (fieldId in record) return record[fieldId as keyof LogEvent];
  return null;
}

export function displayFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(String).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

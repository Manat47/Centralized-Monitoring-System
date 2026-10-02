import type { LogEvent } from "@/app/features/projects/api";

export type TimeSelection = "15m" | "1h" | "24h" | "7d" | string;
export type Exclusion = { field: "source" | "event_type" | "severity"; value: string };

export function parseQuery(input: string): { params: URLSearchParams; exclusions: Exclusion[] } {
  const params = new URLSearchParams();
  const exclusions: Exclusion[] = [];
  const words = input.trim().split(/\s+/).filter(Boolean);
  const search: string[] = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const excluded = word === "NOT";
    const token = excluded ? words[++index] : word;
    if (!token) throw new Error("Add a field after NOT.");
    const field = /^(source|event_type|severity):(.+)$/i.exec(token);
    if (field) {
      const key = field[1].toLowerCase() as Exclusion["field"];
      const value = field[2];
      if (key === "severity" && !["INFO", "WARN", "ERROR", "CRITICAL"].includes(value.toUpperCase())) throw new Error("Severity must be INFO, WARN, ERROR, or CRITICAL.");
      if (excluded) exclusions.push({ field: key, value });
      else params.set(key, key === "severity" ? value.toUpperCase() : value);
      continue;
    }
    if (excluded) throw new Error("NOT supports source, event_type, or severity on the loaded records.");
    const comparison = /^(status_code|duration_ms)(>=|<=|=|>|<)(\d+(?:\.\d+)?)$/i.exec(token);
    if (comparison) {
      search.push(`${comparison[1].toLowerCase()}${comparison[2]}${comparison[3]}`);
      continue;
    }
    if (/^(status_code|duration_ms)$/i.test(token) && /^(>=|<=|=|>|<)$/.test(words[index + 1] ?? "") && /^\d+(?:\.\d+)?$/.test(words[index + 2] ?? "")) {
      search.push(`${token.toLowerCase()}${words[index + 1]}${words[index + 2]}`);
      index += 2;
      continue;
    }
    if (/^status_code:\d{3}$/i.test(token)) {
      search.push(`status_code=${token.slice(12)}`);
      continue;
    }
    if (token.includes(":")) throw new Error(`Unsupported filter: ${token}`);
    search.push(token);
  }
  if (search.length) params.set("search", search.join(" "));
  return { params, exclusions };
}

export function timeBounds(time: TimeSelection, now = Date.now()): { from: string; to?: string } {
  const durations: Record<string, number> = { "15m": 15, "1h": 60, "24h": 1440, "7d": 10080 };
  if (time in durations) return { from: new Date(now - durations[time] * 60_000).toISOString() };
  const [from, to] = time.split(",");
  if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from) >= Date.parse(to)) throw new Error("Invalid time range in URL.");
  return { from, to };
}

export function matchesExclusions(record: LogEvent, exclusions: Exclusion[]): boolean {
  return exclusions.every(({ field, value }) => String(record[field] ?? "").toLowerCase() !== value.toLowerCase());
}

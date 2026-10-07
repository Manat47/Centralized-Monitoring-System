import { authenticatedFetch } from "@/app/lib/authenticated-fetch";
import type { LogFindingRule, LogFindingRuleInput, LogFindingRuleWithSummary } from "./types";

const base = `${process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api"}/log-finding-rules`;

async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${base}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? `Rule request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const rulePath = (id: string) => `/${encodeURIComponent(id)}`;

export const logFindingRulesApi = {
  list: () => request<LogFindingRuleWithSummary[]>(),
  create: (input: LogFindingRuleInput) => request<LogFindingRule>("", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: Partial<LogFindingRuleInput>) => request<LogFindingRule>(rulePath(id), { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(rulePath(id), { method: "DELETE" }),
};

import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export type ProjectRole = "OWNER" | "MAINTAINER" | "VIEWER";
export interface Project { projectId: string; name: string; role: ProjectRole; createdAt: string }
export interface Member { userId: string; email: string; role: ProjectRole; createdAt: string }
export interface ProjectToken { tokenId: string; name: string; prefix: string; createdAt: string; revokedAt: string | null; lastUsedAt: string | null }
export interface CreatedToken { tokenId: string; name: string; prefix: string; token: string }
export interface Usage { month: string; timezone: string; acceptedRecords: number; requestsPerMinute: number; rateLimitRpm: number; recentRejections: { at: string; status: number; reason: string }[]; last24h: { requests: number; acceptedRequests: number; rejectedRequests: number; acceptedRecords: number; storedRecords: number } }
export interface LogEvent {
  eventId: string; requestId: string; projectId: string; tokenId: string | null; tokenName: string | null;
  timestamp: string; receivedAt: string; timeSource: "client" | "received";
  source: string; event_type: string; severity: string | null; message: string | null;
  duration_ms: number | null; status_code: number | null; user_id: string | null;
  clientIp: string | null; location: string | null; tags: string[]; rawPayload: Record<string, unknown>;
  processingStatus: string;
}
export interface FacetValue { value: string; count: number }
export interface LogPage {
  items: LogEvent[]; nextOffset: number | null; total: number;
  facets: { eventTypes: FacetValue[]; statusCodes: FacetValue[]; ips: FacetValue[]; locations: FacetValue[]; sources: FacetValue[] };
  histogram: { bucket: string; severity: string; count: number }[];
  filters: { field: string; operator: string; value: string }[]; from: string; to: string;
}
export interface ActivityRule {
  ruleId: string; name: string; eventType: string; conditionField: string;
  conditionValue: string; groupBy: "project" | "client.ip" | "user_id" | "token_id"; threshold: number;
  windowMinutes: number; enabled: boolean; createdAt: string; sampleCount?: number;
  waitingForData?: boolean; dataSource: "ACCEPTED_RECORDS" | "LOG_API_REQUESTS";
}
export type ActivityRuleDraft = Pick<ActivityRule, "name" | "eventType" | "conditionField" | "conditionValue" | "groupBy" | "threshold" | "windowMinutes" | "dataSource">;
export interface ActivityFinding {
  findingId: string; ruleId: string; ruleName: string; groupValue: string;
  matchedCount: number; triggeredAt: string; windowStart: string; eventId: string;
  dataSource: "ACCEPTED_RECORDS" | "LOG_API_REQUESTS"; eventType: string; conditionField: string;
  conditionValue: string; groupBy: string;
}
export interface FindingPage { items: ActivityFinding[]; nextOffset: number | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(error?.message) ? error.message.join(", ") : error?.message;
    throw new Error(message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const path = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
export const projectApi = {
  list: () => request<Project[]>("/projects"),
  invalidRpm: () => request<{ invalidRequestsPerMinute: number }>("/projects/invalid-rpm"),
  create: (name: string) => request<Project>("/projects", { method: "POST", body: JSON.stringify({ name }) }),
  get: (id: string) => request<Project>(path(id)),
  members: (id: string) => request<Member[]>(`${path(id)}/members`),
  addMember: (id: string, email: string, role: ProjectRole) => request<Member>(`${path(id)}/members`, { method: "POST", body: JSON.stringify({ email, role }) }),
  setMemberRole: (id: string, userId: string, role: ProjectRole) => request<Member>(`${path(id)}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeMember: (id: string, userId: string) => request<{ removed: boolean }>(`${path(id)}/members/${userId}`, { method: "DELETE" }),
  tokens: (id: string) => request<ProjectToken[]>(`${path(id)}/tokens`),
  createToken: (id: string, name: string) => request<CreatedToken>(`${path(id)}/tokens`, { method: "POST", body: JSON.stringify({ name }) }),
  revokeToken: (id: string, tokenId: string) => request<{ revoked: boolean }>(`${path(id)}/tokens/${tokenId}`, { method: "DELETE" }),
  usage: (id: string) => request<Usage>(`${path(id)}/usage`),
  logs: (id: string, params: URLSearchParams) => request<LogPage>(`${path(id)}/logs?${params.toString()}`),
  logValues: (id: string, params: URLSearchParams) => request<FacetValue[]>(`${path(id)}/logs/values?${params.toString()}`),
  activityRules: (id: string) => request<ActivityRule[]>(`${path(id)}/activity-rules`),
  createActivityRule: (id: string, draft: ActivityRuleDraft) => request<ActivityRule>(`${path(id)}/activity-rules`, { method: "POST", body: JSON.stringify(draft) }),
  previewActivityRule: (id: string, draft: ActivityRuleDraft) => request<{ matchingRecords: number; usableGroupRecords: number }>(`${path(id)}/activity-rules/preview`, { method: "POST", body: JSON.stringify(draft) }),
  setActivityRuleEnabled: (id: string, ruleId: string, enabled: boolean) => request<ActivityRule>(`${path(id)}/activity-rules/${ruleId}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  activityFindings: (id: string, params = new URLSearchParams()) => request<FindingPage>(`${path(id)}/activity-findings?${params.toString()}`),
};

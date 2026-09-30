import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export type ProjectRole = "OWNER" | "MAINTAINER" | "VIEWER";
export interface Project { projectId: string; name: string; role: ProjectRole; createdAt: string }
export interface Member { userId: string; email: string; role: ProjectRole; createdAt: string }
export interface ProjectToken { tokenId: string; name: string; prefix: string; createdAt: string; revokedAt: string | null; lastUsedAt: string | null }
export interface CreatedToken { tokenId: string; name: string; prefix: string; token: string }
export interface Usage { month: string; timezone: string; acceptedRecords: number; requestsPerMinute: number }
export interface Activity { activityId: string; actorUserId: string; action: string; resourceId: string | null; detail: Record<string, unknown>; occurredAt: string }
export interface LogEvent { eventId: string; timestamp: string; source: string; event_type: string; message: string; tenant_id: string | null; status_code: number | null; duration_ms: number | null; metadata: Record<string, unknown> }
export interface LogPage { items: LogEvent[]; nextOffset: number | null }

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
  activity: (id: string) => request<Activity[]>(`${path(id)}/activity`),
  logs: (id: string, params: URLSearchParams) => request<LogPage>(`${path(id)}/logs?${params.toString()}`),
};

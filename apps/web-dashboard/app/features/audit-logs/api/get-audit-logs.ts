import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  AuditLogListParams,
  AuditLogListResponse,
} from "../types/audit-log";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getAuditLogs(
  params: AuditLogListParams,
): Promise<AuditLogListResponse> {
  const searchParams = new URLSearchParams();

  if (params.actorUserId) {
    searchParams.set("actorUserId", params.actorUserId);
  }

  if (params.actorRole) {
    searchParams.set("actorRole", params.actorRole);
  }

  if (params.action) {
    searchParams.set("action", params.action);
  }

  if (params.resourceType) {
    searchParams.set("resourceType", params.resourceType);
  }

  if (params.result) {
    searchParams.set("result", params.result);
  }

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.to) {
    searchParams.set("to", params.to);
  }

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 20));

  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/audit-logs?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch audit logs: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as AuditLogListResponse;
}

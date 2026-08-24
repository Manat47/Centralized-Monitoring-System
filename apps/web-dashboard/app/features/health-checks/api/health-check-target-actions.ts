import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  CreateHealthCheckTargetInput,
  HealthCheckTarget,
  LatestHealthCheck,
  UpdateHealthCheckTargetInput,
} from "../types/health-check";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function parseResponse<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const detail = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    throw new Error(detail || `${message}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function createHealthCheckTarget(
  input: CreateHealthCheckTargetInput,
): Promise<HealthCheckTarget> {
  const response = await authenticatedFetch(`${API_GATEWAY_URL}/health-check-targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse(response, "Failed to create health check");
}

export async function updateHealthCheckTarget(
  healthCheckTargetId: string,
  input: UpdateHealthCheckTargetInput,
): Promise<HealthCheckTarget> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/health-check-targets/${healthCheckTargetId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  return parseResponse(response, "Failed to update health check");
}

async function runTargetAction<T>(
  healthCheckTargetId: string,
  action: "enable" | "disable" | "archive" | "check-now",
): Promise<T> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/health-check-targets/${healthCheckTargetId}/${action}`,
    { method: "POST" },
  );

  return parseResponse(response, `Failed to ${action} health check`);
}

export const resumeHealthCheckTarget = (id: string) =>
  runTargetAction<HealthCheckTarget>(id, "enable");
export const pauseHealthCheckTarget = (id: string) =>
  runTargetAction<HealthCheckTarget>(id, "disable");
export const archiveHealthCheckTarget = (id: string) =>
  runTargetAction<HealthCheckTarget>(id, "archive");
export const checkHealthCheckTargetNow = (id: string) =>
  runTargetAction<LatestHealthCheck>(id, "check-now");

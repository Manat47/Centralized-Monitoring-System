import type {
  CollectMetricsResponse,
  MonitoringTarget,
} from "../types/monitoring-target";
import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

type MonitoringTargetAction =
  | "verify"
  | "enable"
  | "disable"
  | "archive"
  | "collect";

async function runMonitoringTargetAction(
  targetId: string,
  action: MonitoringTargetAction,
): Promise<MonitoringTarget> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/monitoring-targets/${targetId}/${action}`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to ${action} monitoring target: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MonitoringTarget;
}

export async function collectMonitoringTarget(
  targetId: string,
): Promise<CollectMetricsResponse> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/monitoring-targets/${targetId}/collect`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to collect monitoring target: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as CollectMetricsResponse;
}

export function verifyMonitoringTarget(
  targetId: string,
): Promise<MonitoringTarget> {
  return runMonitoringTargetAction(targetId, "verify");
}

export function enableMonitoringTarget(
  targetId: string,
): Promise<MonitoringTarget> {
  return runMonitoringTargetAction(targetId, "enable");
}

export function disableMonitoringTarget(
  targetId: string,
): Promise<MonitoringTarget> {
  return runMonitoringTargetAction(targetId, "disable");
}

export function archiveMonitoringTarget(
  targetId: string,
): Promise<MonitoringTarget> {
  return runMonitoringTargetAction(targetId, "archive");
}

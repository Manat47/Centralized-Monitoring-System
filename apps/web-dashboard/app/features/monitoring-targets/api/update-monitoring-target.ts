import type {
  CollectMetricsResponse,
  MonitoringTarget,
} from "../types/monitoring-target";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

type MonitoringTargetAction = "verify" | "enable" | "disable" | "collect";

async function runMonitoringTargetAction(
  targetId: string,
  action: MonitoringTargetAction,
): Promise<MonitoringTarget> {
  const response = await fetch(
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
  const response = await fetch(
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

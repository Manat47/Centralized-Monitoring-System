import type {
  CreateMonitoringTargetInput,
  MonitoringTarget,
} from "../types/monitoring-target";
import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function createMonitoringTarget(
  input: CreateMonitoringTargetInput,
): Promise<MonitoringTarget> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/monitoring-targets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to create monitoring target: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as MonitoringTarget;
}

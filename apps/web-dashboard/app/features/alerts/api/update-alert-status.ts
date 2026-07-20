import type { Alert } from "../types/alert";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function updateAlertStatus(
  alertId: string,
  action: "acknowledge" | "close",
): Promise<Alert> {
  const response = await fetch(
    `${API_GATEWAY_URL}/alerts/${alertId}/${action}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to ${action} alert: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as Alert;
}

export function acknowledgeAlert(alertId: string): Promise<Alert> {
  return updateAlertStatus(alertId, "acknowledge");
}

export function closeAlert(alertId: string): Promise<Alert> {
  return updateAlertStatus(alertId, "close");
}

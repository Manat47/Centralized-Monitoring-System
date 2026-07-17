import type { AlertListParams, AlertListResponse } from "../types/alert";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getAlerts(
  params: AlertListParams,
): Promise<AlertListResponse> {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.severity) {
    searchParams.set("severity", params.severity);
  }

  if (params.assetId) {
    searchParams.set("assetId", params.assetId);
  }

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 20));

  const response = await fetch(
    `${API_GATEWAY_URL}/alerts?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch alerts: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as AlertListResponse;
}

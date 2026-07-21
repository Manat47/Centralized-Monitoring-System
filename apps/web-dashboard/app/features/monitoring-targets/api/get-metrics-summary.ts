import type { MetricsSummaryResponse } from "../types/metrics-summary";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface GetMetricsSummaryParams {
  assetId: string;
  start: string;
  end: string;
}

export async function getMetricsSummary({
  assetId,
  start,
  end,
}: GetMetricsSummaryParams): Promise<MetricsSummaryResponse> {
  const searchParams = new URLSearchParams({
    start,
    end,
  });

  const response = await fetch(
    `${API_GATEWAY_URL}/monitoring-targets/${assetId}/metrics/summary?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch metrics summary: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("assetId" in data) ||
    !("timestamp" in data) ||
    !("cpu" in data) ||
    !("memory" in data) ||
    !("disks" in data) ||
    !("networks" in data)
  ) {
    throw new Error("Metrics summary response has an invalid format");
  }

  return data as MetricsSummaryResponse;
}

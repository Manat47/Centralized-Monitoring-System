import type { CpuUsageResponse } from "../types/cpu-usage";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface GetCpuUsageParams {
  assetId: string;
  start: string;
  end: string;
}

export async function getCpuUsage({
  assetId,
  start,
  end,
}: GetCpuUsageParams): Promise<CpuUsageResponse> {
  const searchParams = new URLSearchParams({
    start,
    end,
  });

  const response = await fetch(
    `${API_GATEWAY_URL}/monitoring-targets/${assetId}/metrics/cpu-usage?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch CPU usage: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("CPU usage response is not an array");
  }

  return data as CpuUsageResponse;
}

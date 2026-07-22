import type { MemoryUsageResponse } from "../types/memory-usage";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface GetMemoryUsageParams {
  assetId: string;
  start: string;
  end: string;
}

export async function getMemoryUsage({
  assetId,
  start,
  end,
}: GetMemoryUsageParams): Promise<MemoryUsageResponse> {
  const searchParams = new URLSearchParams({
    start,
    end,
  });

  const response = await fetch(
    `${API_GATEWAY_URL}/monitoring-targets/${assetId}/metrics/memory-usage?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch memory usage: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Memory usage response is not an array");
  }

  return data as MemoryUsageResponse;
}

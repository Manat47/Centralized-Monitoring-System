import type { DiskUsageResponse } from "../types/disk-usage";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface GetDiskUsageParams {
  assetId: string;
  start: string;
  end: string;
}

export async function getDiskUsage({
  assetId,
  start,
  end,
}: GetDiskUsageParams): Promise<DiskUsageResponse> {
  const searchParams = new URLSearchParams({
    start,
    end,
  });

  const response = await fetch(
    `${API_GATEWAY_URL}/monitoring-targets/${assetId}/metrics/disk-usage?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch disk usage: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Disk usage response is not an array");
  }

  return data as DiskUsageResponse;
}

import type { NetworkRateResponse } from "../types/network-rate";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export interface GetNetworkRateParams {
  assetId: string;
  start: string;
  end: string;
}

export async function getNetworkRate({
  assetId,
  start,
  end,
}: GetNetworkRateParams): Promise<NetworkRateResponse> {
  const searchParams = new URLSearchParams({
    start,
    end,
  });

  const response = await fetch(
    `${API_GATEWAY_URL}/monitoring-targets/${assetId}/metrics/network-rate?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch network rate: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Network rate response is not an array");
  }

  return data as NetworkRateResponse;
}

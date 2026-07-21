import type { AssetListResponse } from "../types/asset";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getAssets(): Promise<AssetListResponse> {
  const response = await fetch(`${API_GATEWAY_URL}/assets`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch assets: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as AssetListResponse;
}

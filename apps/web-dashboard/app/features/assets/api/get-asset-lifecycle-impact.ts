import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  AssetLifecycleAction,
  AssetLifecycleImpact,
} from "../types/asset-lifecycle-impact";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getAssetLifecycleImpact(
  assetId: string,
  action: AssetLifecycleAction,
): Promise<AssetLifecycleImpact> {
  const params = new URLSearchParams({ action });
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/asset-lifecycle-impact/${assetId}?${params.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to load lifecycle impact: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as AssetLifecycleImpact;
}

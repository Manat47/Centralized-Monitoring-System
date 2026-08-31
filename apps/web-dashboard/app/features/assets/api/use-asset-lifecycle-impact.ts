"use client";

import { useQuery } from "@tanstack/react-query";

import type { AssetLifecycleAction } from "../types/asset-lifecycle-impact";
import { getAssetLifecycleImpact } from "./get-asset-lifecycle-impact";

export function useAssetLifecycleImpact(
  assetId: string,
  action: AssetLifecycleAction | null,
) {
  return useQuery({
    queryKey: ["asset-lifecycle-impact", assetId, action],
    queryFn: () => getAssetLifecycleImpact(assetId, action!),
    enabled: action !== null,
    staleTime: 0,
    retry: 1,
  });
}

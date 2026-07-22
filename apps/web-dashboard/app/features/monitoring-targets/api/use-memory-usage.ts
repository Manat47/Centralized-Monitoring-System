"use client";

import { useQuery } from "@tanstack/react-query";

import { getMemoryUsage } from "./get-memory-usage";

interface UseMemoryUsageParams {
  assetId: string;
  rangeMinutes?: number;
}

export function useMemoryUsage({
  assetId,
  rangeMinutes = 30,
}: UseMemoryUsageParams) {
  return useQuery({
    queryKey: ["memory-usage", assetId, rangeMinutes],

    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - rangeMinutes * 60_000);

      return getMemoryUsage({
        assetId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },

    enabled: Boolean(assetId),
    refetchInterval: 15_000,
  });
}

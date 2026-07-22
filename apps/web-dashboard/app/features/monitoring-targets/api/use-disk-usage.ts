"use client";

import { useQuery } from "@tanstack/react-query";

import { getDiskUsage } from "./get-disk-usage";

interface UseDiskUsageParams {
  assetId: string;
  rangeMinutes?: number;
}

export function useDiskUsage({
  assetId,
  rangeMinutes = 30,
}: UseDiskUsageParams) {
  return useQuery({
    queryKey: ["disk-usage", assetId, rangeMinutes],

    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - rangeMinutes * 60_000);

      return getDiskUsage({
        assetId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },

    enabled: Boolean(assetId),
    refetchInterval: 15_000,
  });
}

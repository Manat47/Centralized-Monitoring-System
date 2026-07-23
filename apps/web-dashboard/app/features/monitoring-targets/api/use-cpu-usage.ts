"use client";

import { useQuery } from "@tanstack/react-query";

import { getCpuUsage } from "./get-cpu-usage";

interface UseCpuUsageParams {
  assetId: string;
  rangeMinutes?: number;
}

export function useCpuUsage({ assetId, rangeMinutes = 30 }: UseCpuUsageParams) {
  return useQuery({
    queryKey: ["cpu-usage", assetId, rangeMinutes],

    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - rangeMinutes * 60_000);

      return getCpuUsage({
        assetId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },

    enabled: Boolean(assetId),
    refetchInterval: 15_000,
  });
}

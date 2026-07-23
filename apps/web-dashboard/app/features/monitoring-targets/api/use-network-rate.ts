"use client";

import { useQuery } from "@tanstack/react-query";

import { getNetworkRate } from "./get-network-rate";

interface UseNetworkRateParams {
  assetId: string;
  rangeMinutes?: number;
}

export function useNetworkRate({
  assetId,
  rangeMinutes = 30,
}: UseNetworkRateParams) {
  return useQuery({
    queryKey: ["network-rate", assetId, rangeMinutes],

    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - rangeMinutes * 60_000);

      return getNetworkRate({
        assetId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },

    enabled: Boolean(assetId),
    refetchInterval: 15_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { getMetricsSummary } from "./get-metrics-summary";

interface UseMetricsSummaryParams {
  assetId: string;
  rangeMinutes?: number;
}

export function useMetricsSummary({
  assetId,
  rangeMinutes = 30,
}: UseMetricsSummaryParams) {
  return useQuery({
    queryKey: ["metrics-summary", assetId, rangeMinutes],

    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - rangeMinutes * 60_000);

      return getMetricsSummary({
        assetId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },

    enabled: Boolean(assetId),
    refetchInterval: 15_000,
  });
}

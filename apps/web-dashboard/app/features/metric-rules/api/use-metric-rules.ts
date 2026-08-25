"use client";

import { useQuery } from "@tanstack/react-query";

import { getMetricRules } from "./get-metric-rules";

export function useMetricRules(includeArchived = false) {
  return useQuery({
    queryKey: ["metric-rules", { includeArchived }],
    queryFn: () => getMetricRules(includeArchived),
    refetchInterval: 30_000,
  });
}

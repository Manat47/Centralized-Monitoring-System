"use client";

import { useQuery } from "@tanstack/react-query";

import { getMetricRules } from "./get-metric-rules";

export function useMetricRules() {
  return useQuery({
    queryKey: ["metric-rules"],
    queryFn: getMetricRules,
    refetchInterval: 30_000,
  });
}

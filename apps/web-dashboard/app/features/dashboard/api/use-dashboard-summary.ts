"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary } from "./get-dashboard-summary";

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    enabled,
    refetchInterval: 15_000,
  });
}

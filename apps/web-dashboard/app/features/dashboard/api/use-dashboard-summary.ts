"use client";

import { useQuery } from "@tanstack/react-query";

import { getDashboardSummary } from "./get-dashboard-summary";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchInterval: 15_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { getMonitoringTargets } from "./get-monitoring-targets";

export function useMonitoringTargets(includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: ["monitoring-targets", { includeArchived }],
    queryFn: () => getMonitoringTargets(includeArchived),
    enabled,
    refetchInterval: 15_000,
  });
}

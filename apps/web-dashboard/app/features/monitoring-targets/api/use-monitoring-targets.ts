"use client";

import { useQuery } from "@tanstack/react-query";

import { getMonitoringTargets } from "./get-monitoring-targets";

export function useMonitoringTargets() {
  return useQuery({
    queryKey: ["monitoring-targets"],
    queryFn: getMonitoringTargets,
    refetchInterval: 15_000,
  });
}

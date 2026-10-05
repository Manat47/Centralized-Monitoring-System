"use client";

import { useQuery } from "@tanstack/react-query";

import { getHealthCheckTargets } from "./get-health-check-targets";

export function useHealthCheckTargets(enabled = true) {
  return useQuery({
    queryKey: ["health-check-targets"],
    queryFn: getHealthCheckTargets,
    enabled,
    refetchInterval: 15_000,
  });
}

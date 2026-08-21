"use client";

import { useQuery } from "@tanstack/react-query";

import { getHealthCheckTargets } from "./get-health-check-targets";

export function useHealthCheckTargets() {
  return useQuery({
    queryKey: ["health-check-targets"],
    queryFn: getHealthCheckTargets,
    refetchInterval: 15_000,
  });
}

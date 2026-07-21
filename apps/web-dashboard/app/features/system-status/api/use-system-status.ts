"use client";

import { useQuery } from "@tanstack/react-query";

import { getSystemStatus } from "./get-system-status";

export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
    refetchInterval: 10_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";

import { getAlertById } from "./get-alert-by-id";

export function useAlertById(alertId: string) {
  return useQuery({
    queryKey: ["alerts", alertId],
    queryFn: () => getAlertById(alertId),
    enabled: Boolean(alertId),
    refetchInterval: 10_000,
  });
}

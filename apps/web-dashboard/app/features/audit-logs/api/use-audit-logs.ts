"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "./get-audit-logs";
import type { AuditLogListParams } from "../types/audit-log";

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => getAuditLogs(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

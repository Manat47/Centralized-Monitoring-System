"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListReportsParams } from "../types/report";
import { downloadReport, generateReport, getReports } from "./reports";

export function useReports(params: ListReportsParams) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: () => getReports(params),
    refetchInterval: (query) =>
      query.state.data?.items.some((report) => report.status === "GENERATING")
        ? 5_000
        : 30_000,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useDownloadReport() {
  return useMutation({ mutationFn: downloadReport });
}

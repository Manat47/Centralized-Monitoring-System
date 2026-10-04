"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logFindingRulesApi } from "./api";
import type { LogFindingRuleInput } from "./types";

const queryKey = ["log-finding-rules"] as const;

export function useLogFindingRules() {
  return useQuery({ queryKey, queryFn: logFindingRulesApi.list });
}

export function useCreateLogFindingRule() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: logFindingRulesApi.create, onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
}

export function useUpdateLogFindingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LogFindingRuleInput> }) => logFindingRulesApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteLogFindingRule() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: logFindingRulesApi.remove, onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMetricRule } from "./create-metric-rule";
import {
  archiveMetricRule,
  disableMetricRule,
  enableMetricRule,
  updateMetricRule,
} from "./metric-rule-actions";
import type { UpdateMetricRuleInput } from "../types/metric-rule";

export function useCreateMetricRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMetricRule,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["metric-rules"],
      });
    },
  });
}

function useRuleAction(mutationFn: (ruleId: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["metric-rules"] });
    },
  });
}

export function useUpdateMetricRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      input,
    }: {
      ruleId: string;
      input: UpdateMetricRuleInput;
    }) => updateMetricRule(ruleId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["metric-rules"] });
    },
  });
}

export const useEnableMetricRule = () => useRuleAction(enableMetricRule);
export const useDisableMetricRule = () => useRuleAction(disableMetricRule);
export const useArchiveMetricRule = () => useRuleAction(archiveMetricRule);

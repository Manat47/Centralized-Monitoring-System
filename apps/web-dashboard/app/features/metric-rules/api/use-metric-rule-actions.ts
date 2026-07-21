"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMetricRule } from "./create-metric-rule";

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

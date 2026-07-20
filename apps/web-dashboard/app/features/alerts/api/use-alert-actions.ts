"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { acknowledgeAlert, closeAlert } from "./update-alert-status";

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acknowledgeAlert,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["alerts"],
      });
    },
  });
}

export function useCloseAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeAlert,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["alerts"],
      });
    },
  });
}

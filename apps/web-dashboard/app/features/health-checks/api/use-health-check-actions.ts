"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  archiveHealthCheckTarget,
  checkHealthCheckTargetNow,
  createHealthCheckTarget,
  pauseHealthCheckTarget,
  resumeHealthCheckTarget,
  updateHealthCheckTarget,
} from "./health-check-target-actions";

function useAction(mutationFn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["health-check-targets"] });
    },
  });
}

export function useCreateHealthCheckTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHealthCheckTarget,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["health-check-targets"] });
    },
  });
}

export function useUpdateHealthCheckTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checkIntervalSeconds }: { id: string; checkIntervalSeconds: number }) =>
      updateHealthCheckTarget(id, { checkIntervalSeconds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["health-check-targets"] });
    },
  });
}

export const usePauseHealthCheckTarget = () => useAction(pauseHealthCheckTarget);
export const useResumeHealthCheckTarget = () => useAction(resumeHealthCheckTarget);
export const useArchiveHealthCheckTarget = () => useAction(archiveHealthCheckTarget);
export const useCheckHealthCheckTargetNow = () => useAction(checkHealthCheckTargetNow);

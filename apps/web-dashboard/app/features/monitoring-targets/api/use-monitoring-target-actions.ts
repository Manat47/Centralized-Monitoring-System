"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMonitoringTarget } from "./create-monitoring-target";
import {
  collectMonitoringTarget,
  disableMonitoringTarget,
  enableMonitoringTarget,
  verifyMonitoringTarget,
} from "./update-monitoring-target";

export function useCreateMonitoringTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMonitoringTarget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["monitoring-targets"],
      });
    },
  });
}

export function useVerifyMonitoringTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyMonitoringTarget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["monitoring-targets"],
      });
    },
  });
}

export function useEnableMonitoringTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enableMonitoringTarget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["monitoring-targets"],
      });
    },
  });
}

export function useDisableMonitoringTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disableMonitoringTarget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["monitoring-targets"],
      });
    },
  });
}

export function useCollectMonitoringTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: collectMonitoringTarget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["monitoring-targets"],
      });
    },
  });
}

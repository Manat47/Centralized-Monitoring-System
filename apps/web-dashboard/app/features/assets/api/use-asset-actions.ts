"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAsset } from "./create-asset";
import { deactivateAsset } from "./deactivate-asset";
import { updateAsset } from "./update-asset";
import { updateAssetStatus } from "./update-asset-status";

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAsset,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["assets"],
      });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAsset,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["assets"],
      });
    },
  });
}

export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAssetStatus,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["assets"],
      });
    },
  });
}

export function useDeactivateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateAsset,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["assets"],
      });
    },
  });
}

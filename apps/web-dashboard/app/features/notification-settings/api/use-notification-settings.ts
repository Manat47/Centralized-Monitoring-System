"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationSettings,
  testNotificationChannel,
  createNotificationChannel,
  patchNotificationChannel,
  deleteNotificationChannel,
  patchNotificationRouting,
} from "./notification-settings";

const settingsQueryKey = ["multi-channel-notification-settings"];

export function useMultiChannelSettings() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: getNotificationSettings });
}

export function useTestNotificationChannel() {
  return useMutation({ mutationFn: testNotificationChannel });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNotificationChannel,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

export function usePatchNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchNotificationChannel,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotificationChannel,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

export function usePatchNotificationRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchNotificationRouting,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

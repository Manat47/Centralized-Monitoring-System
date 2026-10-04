"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationRecipients,
  sendTestNotification,
  updateNotificationRecipients,
  getNotificationSettings,
  updateNotificationSettings,
  testNotificationChannel,
} from "./notification-settings";

const queryKey = ["notification-recipients"];

export function useNotificationRecipients() {
  return useQuery({
    queryKey,
    queryFn: getNotificationRecipients,
  });
}

export function useUpdateNotificationRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationRecipients,
    onSuccess: (recipients) => {
      queryClient.setQueryData(queryKey, recipients);
    },
  });
}

export function useSendTestNotification() {
  return useMutation({ mutationFn: sendTestNotification });
}

const settingsQueryKey = ["multi-channel-notification-settings"];

export function useMultiChannelSettings() {
  return useQuery({ queryKey: settingsQueryKey, queryFn: getNotificationSettings });
}

export function useUpdateMultiChannelSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  });
}

export function useTestNotificationChannel() {
  return useMutation({ mutationFn: testNotificationChannel });
}

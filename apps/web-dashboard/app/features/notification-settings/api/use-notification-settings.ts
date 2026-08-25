"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationRecipients,
  sendTestNotification,
  updateNotificationRecipients,
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

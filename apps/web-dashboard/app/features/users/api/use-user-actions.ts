"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "./create-user";
import { updateUser } from "./update-user";
import { updateUserStatus } from "./update-user-status";
import { resendUserInvitation } from "./resend-user-invitation";
import { revokeUserInvitation } from "./revoke-user-invitation";
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "../types/user";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserInput;
    }) => updateUser(userId, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserStatusInput;
    }) => updateUserStatus(userId, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}

export function useResendUserInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => resendUserInvitation(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRevokeUserInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => revokeUserInvitation(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

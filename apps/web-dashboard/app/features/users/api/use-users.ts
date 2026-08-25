"use client";

import { useQuery } from "@tanstack/react-query";

import { getAllUsers, getUsers } from "./get-users";
import type { ListUsersQuery } from "../types/user";

export function useUsers(query: ListUsersQuery = {}) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () => getUsers(query),
  });
}

export function useAllUsers(
  query: Omit<ListUsersQuery, "page" | "limit"> = {},
) {
  return useQuery({
    queryKey: ["users", "all", query],
    queryFn: () => getAllUsers(query),
  });
}

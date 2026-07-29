"use client";

import { useQuery } from "@tanstack/react-query";

import { getUsers } from "./get-users";
import type { ListUsersQuery } from "../types/user";

export function useUsers(query: ListUsersQuery = {}) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () => getUsers(query),
  });
}

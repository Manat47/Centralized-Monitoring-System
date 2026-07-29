import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { ListUsersQuery, ListUsersResponse } from "../types/user";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

export async function getUsers(
  query: ListUsersQuery = {},
): Promise<ListUsersResponse> {
  const searchParams = new URLSearchParams();

  if (query.role) {
    searchParams.set("role", query.role);
  }

  if (query.status) {
    searchParams.set("status", query.status);
  }

  if (query.search?.trim()) {
    searchParams.set("search", query.search.trim());
  }

  searchParams.set("page", String(query.page ?? 1));
  searchParams.set("limit", String(query.limit ?? 20));

  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/users?${searchParams.toString()}`,
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `Failed to fetch users: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as ListUsersResponse;
}

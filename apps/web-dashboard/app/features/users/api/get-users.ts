import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type { ListUsersQuery, ListUsersResponse, User } from "../types/user";

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

export async function getAllUsers(
  query: Omit<ListUsersQuery, "page" | "limit"> = {},
): Promise<User[]> {
  const users: User[] = [];
  let page = 1;

  while (true) {
    const response = await getUsers({ ...query, page, limit: 100 });
    users.push(...response.items);

    if (users.length >= response.total || response.items.length === 0) {
      return users;
    }

    page += 1;
  }
}

"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { useAuth } from "@/app/features/auth/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useUsers } from "../api/use-users";
import type { UserRole, UserStatus } from "../types/user";
import { UserActions } from "./user-actions";

const pageSize = 20;

function formatDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRole(role: UserRole): string {
  return role === "ADMIN" ? "Admin" : "Operator";
}

function formatStatus(status: UserStatus): string {
  if (status === "INVITED") return "Invited";
  return status === "ACTIVE" ? "Active" : "Inactive";
}

export function UsersTable() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"ALL" | UserRole>("ALL");
  const [status, setStatus] = useState<"ALL" | UserStatus>("ALL");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const usersQuery = useUsers({
    search: debouncedSearch || undefined,
    role: role === "ALL" ? undefined : role,
    status: status === "ALL" ? undefined : status,
    page,
    limit: pageSize,
  });

  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const firstResult = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);
  const hasFilters = Boolean(search || role !== "ALL" || status !== "ALL");

  function resetFilters(): void {
    setSearch("");
    setDebouncedSearch("");
    setRole("ALL");
    setStatus("ALL");
    setPage(1);
  }

  if (usersQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium text-destructive">Failed to load users</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "Unknown error"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void usersQuery.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <div className="min-w-64 flex-1 space-y-1.5">
            <label
              htmlFor="user-search"
              className="text-xs font-medium text-muted-foreground"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Name or email"
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">
              Role
            </span>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole((value ?? "ALL") as "ALL" | UserRole);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue>
                  {role === "ALL" ? "All roles" : formatRole(role)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OPERATOR">Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus((value ?? "ALL") as "ALL" | UserStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue>
                  {status === "ALL" ? "All statuses" : formatStatus(status)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="INVITED">Invited</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasFilters}
            onClick={resetFilters}
          >
            <X className="size-4" />
            Clear
          </Button>

          <span className="ml-auto pb-2 text-sm text-muted-foreground">
            {usersQuery.isFetching
              ? "Updating..."
              : `${total} ${total === 1 ? "user" : "users"}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="min-w-52 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody
              className={usersQuery.isFetching ? "opacity-60" : undefined}
            >
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <p className="font-medium">No users found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adjust the filters or clear the current search.
                    </p>
                    {hasFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={resetFilters}
                      >
                        Clear filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isCurrentUser = currentUser?.userId === user.userId;

                  return (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.displayName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-primary">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === "ADMIN"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : undefined
                          }
                        >
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.invitationStatus === "PENDING"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : user.invitationStatus === "EXPIRED"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : user.invitationStatus === "REVOKED"
                                  ? "bg-muted text-muted-foreground"
                                  : user.status === "ACTIVE"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "bg-muted text-muted-foreground"
                          }
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {user.invitationStatus === "PENDING"
                            ? "Invite pending"
                            : user.invitationStatus === "EXPIRED"
                              ? "Invite expired"
                              : user.invitationStatus === "REVOKED"
                                ? "Invite revoked"
                                : formatStatus(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {user.invitationStatus === "PENDING" ||
                        user.invitationStatus === "EXPIRED" ? (
                          <div>
                            <p>
                              {user.invitationStatus === "PENDING"
                                ? "Expires"
                                : "Expired"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(user.invitationExpiresAt)}
                            </p>
                          </div>
                        ) : (
                          formatDate(user.lastLoginAt)
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing {firstResult}-{lastResult} of {total}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Page {usersQuery.data?.page ?? page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={page <= 1 || usersQuery.isFetching}
                onClick={() => setPage((value) => value - 1)}
                title="Previous page"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
                title="Next page"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

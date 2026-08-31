"use client";

import { useMemo, useState } from "react";
import { Mail, Plus, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { User } from "../../users/types/user";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RecipientPickerProps {
  users: User[];
  emails: string[];
  usersLoading: boolean;
  usersUnavailable: boolean;
  onAdd: (email: string) => void;
}

export function RecipientPicker({
  users,
  emails,
  usersLoading,
  usersUnavailable,
  onAdd,
}: RecipientPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  const availableUsers = useMemo(() => {
    const configured = new Set(emails);
    const activeUsers = users.filter(
      (user) =>
        user.status === "ACTIVE" &&
        !configured.has(user.email.trim().toLowerCase()),
    );

    if (!normalizedQuery) {
      return activeUsers.slice(0, 8);
    }

    return activeUsers
      .filter((user) => {
        const displayName = user.displayName.toLowerCase();
        const email = user.email.toLowerCase();
        return (
          displayName.includes(normalizedQuery) ||
          email.includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  }, [emails, normalizedQuery, users]);

  const exactUserEmail = users.some(
    (user) =>
      user.status === "ACTIVE" &&
      user.email.trim().toLowerCase() === normalizedQuery,
  );
  const canAddExternal =
    emailPattern.test(normalizedQuery) &&
    !emails.includes(normalizedQuery) &&
    !exactUserEmail;

  function add(email: string) {
    onAdd(email.trim().toLowerCase());
    setQuery("");
    setOpen(false);
  }

  const hasOptions = availableUsers.length > 0 || canAddExternal;
  const optionCount = availableUsers.length + (canAddExternal ? 1 : 0);

  function selectHighlightedOption() {
    const user = availableUsers[highlightedIndex];

    if (user) {
      add(user.email);
      return;
    }

    if (canAddExternal && highlightedIndex === availableUsers.length) {
      add(normalizedQuery);
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="recipient-search" className="text-sm font-medium">
        Add recipient
      </label>
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="recipient-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                setOpen(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpen(true);
                  setHighlightedIndex((current) =>
                    Math.min(current + 1, Math.max(optionCount - 1, 0)),
                  );
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedIndex((current) => Math.max(current - 1, 0));
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  selectHighlightedOption();
                }
              }}
              placeholder="Search a system user or enter an external email"
              className="
  h-10 pl-9
  focus-visible:border-blue-500
  focus-visible:ring-2
  focus-visible:ring-blue-500/20
"
              role="combobox"
              aria-expanded={open}
              aria-controls="recipient-options"
              aria-activedescendant={
                open && optionCount > 0
                  ? `recipient-option-${highlightedIndex}`
                  : undefined
              }
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!canAddExternal}
            onClick={() => add(normalizedQuery)}
            title="Add external email"
            className="
    transition-[color,background-color,border-color,transform] duration-150
    hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700
    active:scale-[0.99]
  "
          >
            <Plus className="size-4" />
            Add email
          </Button>
        </div>

        {open && (
          <div
            id="recipient-options"
            role="listbox"
            className="mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-slate-300 bg-white p-1.5 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 sm:w-[calc(100%-7.75rem)]"
          >
            {usersLoading ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                Loading system users...
              </p>
            ) : (
              <>
                {availableUsers.map((user, index) => (
                  <button
                    key={user.userId}
                    id={`recipient-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => add(user.email)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left focus-visible:outline-none ${
                      highlightedIndex === index
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <UserRound className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {user.displayName}
                      </span>
                      <span className="block truncate text-xs text-slate-600">
                        {user.email} ·{" "}
                        {user.role === "ADMIN" ? "Admin" : "Operator"}
                      </span>
                    </span>
                    <span className="hidden shrink-0 rounded border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 sm:inline-flex">
                      System user
                    </span>
                  </button>
                ))}

                {canAddExternal && (
                  <button
                    id={`recipient-option-${availableUsers.length}`}
                    type="button"
                    role="option"
                    aria-selected={highlightedIndex === availableUsers.length}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() =>
                      setHighlightedIndex(availableUsers.length)
                    }
                    onClick={() => add(normalizedQuery)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left focus-visible:outline-none ${
                      highlightedIndex === availableUsers.length
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        Add external email
                      </span>
                      <span className="block truncate text-xs text-slate-600">
                        {normalizedQuery}
                      </span>
                    </span>
                  </button>
                )}

                {!hasOptions && (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {normalizedQuery
                      ? "No matching active user. Enter a valid external email."
                      : "No active users available to add."}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {usersUnavailable && (
        <p className="text-xs text-amber-700">
          System users could not be loaded. External email entry is still
          available.
        </p>
      )}
    </div>
  );
}

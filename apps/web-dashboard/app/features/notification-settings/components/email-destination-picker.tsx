"use client";

import { useMemo, useState } from "react";
import { Mail, Search, UserRound } from "lucide-react";

import type { User } from "@/app/features/users/types/user";
import { Input } from "@/components/ui/input";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailDestinationPickerProps {
  value: string;
  users: User[];
  usersUnavailable: boolean;
  existingEmails: string[];
  onChange: (email: string) => void;
  disabled?: boolean;
}

export function EmailDestinationPicker({
  value,
  users,
  usersUnavailable,
  existingEmails,
  onChange,
  disabled = false,
}: EmailDestinationPickerProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const query = value.trim().toLowerCase();
  const configured = useMemo(
    () => new Set(existingEmails.map((email) => email.trim().toLowerCase())),
    [existingEmails],
  );
  const activeUsers = users.filter((user) => user.status === "ACTIVE");
  const matches = activeUsers
    .filter((user) => !configured.has(user.email.trim().toLowerCase()))
    .filter((user) =>
      !query || user.displayName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    )
    .slice(0, 8);
  const isSystemEmail = activeUsers.some((user) => user.email.trim().toLowerCase() === query);
  const canAddExternal = emailPattern.test(query) && !isSystemEmail && !configured.has(query);
  const optionCount = matches.length + (canAddExternal ? 1 : 0);

  function select(email: string) {
    onChange(email.trim().toLowerCase());
    setOpen(false);
  }

  function selectHighlighted() {
    if (matches[highlightedIndex]) {
      select(matches[highlightedIndex].email);
    } else if (canAddExternal && highlightedIndex === matches.length) {
      select(query);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-[1.1rem] size-4 text-muted-foreground" />
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlightedIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((index) => Math.min(index + 1, Math.max(optionCount - 1, 0)));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && open && optionCount > 0) {
            event.preventDefault();
            selectHighlighted();
          }
        }}
        placeholder="Search a system user or enter an external email"
        maxLength={2048}
        required
        autoComplete="off"
        role="combobox"
        aria-label="Recipient email"
        aria-expanded={open}
        aria-controls="email-destination-options"
        aria-activedescendant={open && optionCount > 0 ? `email-destination-option-${highlightedIndex}` : undefined}
        className="h-9 bg-white pl-9 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:bg-slate-950"
      />
      {open && (
        <div
          id="email-destination-options"
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-950"
        >
          {matches.map((user, index) => (
            <button
              key={user.userId}
              id={`email-destination-option-${index}`}
              type="button"
              role="option"
              aria-selected={highlightedIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => select(user.email)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${highlightedIndex === index ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
            >
              <UserRound className="size-4 shrink-0 text-blue-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{user.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <span className="shrink-0 rounded border border-blue-200 px-1.5 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:text-blue-300">System user</span>
            </button>
          ))}
          {canAddExternal && (
            <button
              id={`email-destination-option-${matches.length}`}
              type="button"
              role="option"
              aria-selected={highlightedIndex === matches.length}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(matches.length)}
              onClick={() => select(query)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${highlightedIndex === matches.length ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Add external email</span>
                <span className="block truncate text-xs text-muted-foreground">{query}</span>
              </span>
            </button>
          )}
          {optionCount === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {configured.has(query) ? "This email is already configured." : "No matching active user. Enter a valid external email."}
            </p>
          )}
        </div>
      )}
      {usersUnavailable && (
        <p className="mt-1 text-xs text-amber-700">System users could not be loaded. You can still enter an external email.</p>
      )}
    </div>
  );
}

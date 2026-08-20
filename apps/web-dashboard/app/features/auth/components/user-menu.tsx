"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useAuth } from "./auth-provider";

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();

      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
        {getInitials(user.displayName)}
      </div>

      <div className="hidden min-w-0 sm:block">
        <div className="flex items-center gap-2">
          <p className="max-w-40 truncate text-sm font-medium text-slate-900">
            {user.displayName}
          </p>

          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
            {user.role}
          </span>
        </div>

        <p className="max-w-52 truncate text-[11px] text-slate-500">
          {user.email}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Sign out"
        disabled={isLoggingOut}
        onClick={handleLogout}
        className="text-slate-500 hover:text-slate-900"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

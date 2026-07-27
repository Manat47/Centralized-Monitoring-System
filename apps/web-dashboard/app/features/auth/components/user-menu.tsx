"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useAuth } from "./auth-provider";

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
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium">{user.displayName}</p>

        <p className="text-xs text-muted-foreground">{user.role}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLoggingOut}
        onClick={handleLogout}
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}

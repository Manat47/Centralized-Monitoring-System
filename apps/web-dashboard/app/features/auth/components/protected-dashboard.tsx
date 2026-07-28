"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";

interface ProtectedDashboardProps {
  children: ReactNode;
}

export function ProtectedDashboard({ children }: ProtectedDashboardProps) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return children;
}

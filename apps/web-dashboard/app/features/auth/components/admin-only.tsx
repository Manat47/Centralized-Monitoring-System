"use client";

import type { ReactNode } from "react";

import { useAuth } from "./auth-provider";

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return fallback;
  }

  return children;
}

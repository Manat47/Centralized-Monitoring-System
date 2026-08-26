import type { ReactNode } from "react";

import { AuthShell } from "@/app/features/auth/components/auth-shell";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <AuthShell>{children}</AuthShell>;
}

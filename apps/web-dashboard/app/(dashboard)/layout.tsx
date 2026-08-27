import type { ReactNode } from "react";

import { DashboardShell } from "@/app/features/auth/components/dashboard-shell";
import { ProtectedDashboard } from "@/app/features/auth/components/protected-dashboard";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedDashboard>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedDashboard>
  );
}

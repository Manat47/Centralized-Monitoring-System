import Link from "next/link";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";

import { ProtectedDashboard } from "@/app/features/auth/components/protected-dashboard";
import { UserMenu } from "@/app/features/auth/components/user-menu";
import { DashboardNavigation } from "@/app/features/auth/components/dashboard-navigation";
import { ServiceStatusIndicator } from "@/app/features/system-status/components/service-status-indicator";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedDashboard>
      <div className="min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
          <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Activity className="size-5" />
              </div>

              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">Monitoring</p>

                <p className="text-[11px] text-slate-400">Control Plane</p>
              </div>
            </Link>
          </div>

          <DashboardNavigation />

          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-[11px] text-slate-500">Centralized Monitoring</p>
          </div>
        </aside>

        <div className="min-h-screen pl-60">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            <ServiceStatusIndicator />

            <UserMenu />
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedDashboard>
  );
}

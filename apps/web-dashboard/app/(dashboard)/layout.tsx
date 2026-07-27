import Link from "next/link";
import type { ReactNode } from "react";

import { ProtectedDashboard } from "@/app/features/auth/components/protected-dashboard";
import { UserMenu } from "@/app/features/auth/components/user-menu";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/alerts", label: "Alerts" },
  { href: "/assets", label: "Assets" },
  {
    href: "/monitoring-targets",
    label: "Monitoring Targets",
  },
  {
    href: "/metric-rules",
    label: "Metric Rules",
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedDashboard>
      <div className="min-h-screen bg-muted/40">
        <aside className="fixed inset-y-0 left-0 w-64 border-r bg-background">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="text-lg font-semibold">
              Banatnaa Monitoring
            </Link>
          </div>

          <nav className="space-y-1 p-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="pl-64">
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <p className="text-sm text-muted-foreground">
              Centralized Infrastructure Monitoring
            </p>

            <UserMenu />
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedDashboard>
  );
}

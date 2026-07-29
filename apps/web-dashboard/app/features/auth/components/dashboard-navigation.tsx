"use client";

import Link from "next/link";

import { useAuth } from "./auth-provider";

interface NavigationItem {
  href: string;
  label: string;
  roles?: Array<"ADMIN" | "OPERATOR">;
}

const navigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/alerts",
    label: "Alerts",
  },
  {
    href: "/assets",
    label: "Assets",
  },
  {
    href: "/monitoring-targets",
    label: "Monitoring Targets",
  },
  {
    href: "/metric-rules",
    label: "Metric Rules",
  },
  {
    href: "/users",
    label: "Users",
    roles: ["ADMIN"],
  },
];

export function DashboardNavigation() {
  const { user } = useAuth();

  const visibleItems = navigation.filter((item) => {
    if (!item.roles) {
      return true;
    }

    return user ? item.roles.includes(user.role) : false;
  });

  return (
    <nav className="space-y-1 p-4">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Crosshair,
  FileText,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Mail,
  ScrollText,
  Server,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAuth } from "./auth-provider";

type UserRole = "ADMIN" | "OPERATOR";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];

  // เอาไว้ชั่วคราวสำหรับหน้าที่ยังไม่ได้สร้าง
  disabled?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

interface DashboardNavigationProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/getting-started",
        label: "Getting Started",
        icon: BookOpen,
      },
    ],
  },

  {
    label: "MONITORING",
    items: [
      {
        href: "/assets",
        label: "Assets",
        icon: Server,
      },
      {
        href: "/monitoring-targets",
        label: "Monitoring Targets",
        icon: Crosshair,
      },
      {
        href: "/health-checks",
        label: "Health Checks",
        icon: HeartPulse,
      },
      {
        href: "/metric-rules",
        label: "Metric Rules",
        icon: Gauge,
      },
    ],
  },

  {
    label: "OPERATIONS",
    items: [
      {
        href: "/alerts",
        label: "Alerts",
        icon: Bell,
      },
      {
        href: "/audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileText,
      },
    ],
  },

  {
    label: "ADMINISTRATION",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: Users,
        roles: ["ADMIN"],
      },
      {
        href: "/notification-settings",
        label: "Notification Settings",
        icon: Mail,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function DashboardNavigation({
  collapsed = false,
  onNavigate,
}: DashboardNavigationProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav
      aria-label="Primary navigation"
      className={cn("flex-1 overflow-y-auto py-5", collapsed ? "px-2" : "px-3")}
    >
      <div className={cn(collapsed ? "space-y-4" : "space-y-6")}>
        {navigationGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) {
              return true;
            }

            return user ? item.roles.includes(user.role) : false;
          });

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div
              key={group.label}
              className={cn(
                collapsed && groupIndex > 0 && "border-t border-slate-800 pt-4",
              )}
            >
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        className={cn(
                          "flex h-9 cursor-not-allowed items-center rounded-md text-sm text-slate-500",
                          collapsed ? "justify-center px-0" : "gap-3 px-2.5",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                    );
                  }

                  const navigationLink = (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex h-9 items-center overflow-hidden rounded-md text-sm font-medium",
                        "transition-[padding,gap,background-color,color,transform,box-shadow] duration-250 ease-out",
                        "active:scale-[0.980]",
                        collapsed ? "gap-0 px-4" : "gap-3 px-2.5",
                        isActive
                          ? "bg-slate-800 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white active:bg-slate-800",
                      )}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute left-0 rounded-r-full bg-blue-500",
                            collapsed ? "h-6 w-0.75" : "h-6 w-0.75",
                          )}
                        />
                      )}

                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-150",
                          isActive
                            ? "text-blue-400"
                            : "text-slate-400 group-hover:text-slate-200",
                        )}
                      />

                      <span
                        aria-hidden={collapsed}
                        className={cn(
                          "overflow-hidden whitespace-nowrap",
                          "transition-[max-width,opacity,transform] duration-200 ease-out",
                          collapsed
                            ? "max-w-0 -translate-x-1 opacity-0"
                            : "max-w- translate-x-0 opacity-100",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );

                  if (!collapsed) {
                    return navigationLink;
                  }

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={navigationLink} />
                      <TooltipContent>{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

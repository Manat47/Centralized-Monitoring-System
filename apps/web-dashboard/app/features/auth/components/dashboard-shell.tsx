"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Activity, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { ServiceStatusIndicator } from "@/app/features/system-status/components/service-status-indicator";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { DashboardNavigation } from "./dashboard-navigation";
import { UserMenu } from "./user-menu";

const SIDEBAR_STORAGE_KEY = "monitoring-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "monitoring-sidebar-change";

interface DashboardShellProps {
  children: ReactNode;
}

function subscribeToSidebarState(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getSidebarState(): boolean {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getServerSidebarState(): boolean {
  return false;
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label={collapsed ? "Monitoring dashboard" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-3",
        collapsed && "justify-center",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
        <Activity className="size-5" />
      </div>

      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">
            Monitoring
          </p>
          <p className="truncate text-[11px] text-slate-400">Control Plane</p>
        </div>
      )}
    </Link>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarState,
    getSidebarState,
    getServerSidebarState,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  function toggleCollapsed(): void {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-[width] duration-200 ease-out lg:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-slate-800",
              collapsed ? "justify-center px-2" : "px-4",
            )}
          >
            <Brand collapsed={collapsed} />
          </div>

          <DashboardNavigation collapsed={collapsed} />

          <div
            className={cn(
              "flex h-14 shrink-0 items-center border-t border-slate-800",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            )}
          >
            {!collapsed && (
              <p className="truncate text-[11px] text-slate-500">
                Centralized Monitoring
              </p>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              className="text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          </div>
        </aside>

        <div
          className={cn(
            "min-h-screen transition-[padding] duration-200 ease-out",
            collapsed ? "lg:pl-16" : "lg:pl-60",
          )}
        >
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="shrink-0 text-slate-600 lg:hidden"
              >
                <Menu className="size-5" />
              </Button>

              <ServiceStatusIndicator />
            </div>

            <UserMenu />
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>

        {mobileOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 animate-in fade-in-0 duration-200 lg:hidden"
            />

            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl animate-in slide-in-from-left duration-200 lg:hidden">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-4">
                <Brand />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="size-5" />
                </Button>
              </div>

              <DashboardNavigation onNavigate={() => setMobileOpen(false)} />

              <div className="flex h-14 shrink-0 items-center border-t border-slate-800 px-4">
                <p className="text-[11px] text-slate-500">
                  Centralized Monitoring
                </p>
              </div>
            </aside>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

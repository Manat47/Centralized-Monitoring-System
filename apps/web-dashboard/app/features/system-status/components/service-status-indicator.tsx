"use client";

import { ChevronDown, CircleAlert, CircleCheck } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSystemStatus } from "../api/use-system-status";

export function ServiceStatusIndicator() {
  const { data, isLoading, isError } = useSystemStatus();

  if (isLoading) {
    return <div className="h-7 w-32 animate-pulse rounded-full bg-slate-100" />;
  }

  if (isError || !data) {
    return (
      <div className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500">
        <CircleAlert className="size-3.5" />
        Platform status unavailable
      </div>
    );
  }

  const healthy = data.status === "HEALTHY";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="View platform service status"
            className={
              healthy
                ? "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                : "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
            }
          />
        }
      >
        {healthy ? (
          <CircleCheck className="size-3.5" />
        ) : (
          <CircleAlert className="size-3.5" />
        )}

        {healthy ? "Platform Healthy" : "Platform Degraded"}

        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-2">
        <div className="px-2 py-2">
          <p className="text-sm font-semibold text-slate-900">
            Platform services
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Internal services used by this monitoring platform
          </p>
        </div>

        <div className="mt-1 border-t border-slate-100 pt-1">
          {data.services.map((service) => {
            const up = service.status === "UP";

            return (
              <div
                key={service.name}
                className="flex items-start justify-between gap-3 rounded-md px-2 py-2.5"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      up ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {service.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {up
                        ? service.responseTimeMs !== null
                          ? `Response ${service.responseTimeMs} ms`
                          : "Operational"
                        : service.error || "Service unavailable"}
                    </p>
                  </div>
                </div>

                <span
                  className={
                    up
                      ? "shrink-0 text-xs font-medium text-emerald-700"
                      : "shrink-0 text-xs font-medium text-rose-700"
                  }
                >
                  {up ? "Operational" : "Unavailable"}
                </span>
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

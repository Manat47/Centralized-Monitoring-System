"use client";

import { CircleAlert } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSystemStatus } from "../api/use-system-status";

export function ServiceStatusIndicator() {
  const { data, isLoading, isError } = useSystemStatus();

  if (isLoading) {
    return <div className="size-4 animate-pulse rounded-full bg-slate-200" aria-label="Checking telemetry pipeline" />;
  }

  if (isError || !data) {
    return (
      <div className="inline-flex size-6 items-center justify-center rounded-full text-slate-500" title="Telemetry Pipeline: Status unavailable" aria-label="Telemetry pipeline status unavailable">
        <CircleAlert className="size-3.5" />
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
            aria-label={healthy ? "Telemetry Pipeline: Operational. View platform services" : "Telemetry Pipeline: Degraded. View platform services"}
            title={healthy ? "Telemetry Pipeline: Operational" : "Telemetry Pipeline: Degraded"}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        }
      >
        <span className={`size-2 rounded-full ${healthy ? "animate-pulse bg-emerald-500" : "bg-rose-500"}`} />
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

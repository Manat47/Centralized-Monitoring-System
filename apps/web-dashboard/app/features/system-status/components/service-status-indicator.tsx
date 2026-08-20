"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

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
        Status unavailable
      </div>
    );
  }

  const healthy = data.status === "HEALTHY";

  return (
    <div
      className={
        healthy
          ? "inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
          : "inline-flex h-7 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700"
      }
    >
      {healthy ? (
        <CircleCheck className="size-3.5" />
      ) : (
        <CircleAlert className="size-3.5" />
      )}

      {healthy ? "All Systems Operational" : "Service Degraded"}
    </div>
  );
}

"use client";

import Link from "next/link";

import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import { getHealthResultStatus } from "@/app/features/health-checks/components/health-check-status";

import { useDashboardSummary } from "../api/use-dashboard-summary";
import type { DashboardHealthStatus } from "../types/dashboard-summary";

const statusClass: Record<DashboardHealthStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  UNAVAILABLE: "bg-rose-50 text-rose-700",
  STALE: "bg-amber-50 text-amber-700",
  UNKNOWN: "bg-slate-100 text-slate-600",
  PAUSED: "bg-slate-100 text-slate-600",
  NOT_CONFIGURED: "bg-slate-100 text-slate-600",
};

export function StandaloneSyntheticChecks() {
  const { data, isLoading, isError } = useDashboardSummary();
  const { data: targets } = useHealthCheckTargets((data?.standaloneChecks?.length ?? 0) > 0);

  if (isLoading) {
    return <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading standalone checks...</section>;
  }

  if (isError || !data) {
    return <section role="status" className="rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-700">Standalone checks could not be loaded.</section>;
  }

  const standaloneChecks = data.standaloneChecks ?? [];
  const standaloneAlerts = data.standaloneAlerts ?? [];
  const targetsById = new Map((targets ?? []).map((target) => [target.healthCheckTargetId, target]));

  if (standaloneChecks.length === 0 && standaloneAlerts.length === 0) {
    return null;
  }

  const checks = [...standaloneChecks].sort((left, right) =>
    Number(right.activeAlerts > 0) - Number(left.activeAlerts > 0) ||
    left.name.localeCompare(right.name),
  );

  return (
    <section aria-labelledby="standalone-checks-heading" className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 id="standalone-checks-heading" className="text-sm font-semibold text-slate-950">Standalone Synthetic Checks</h2>
        <p className="mt-1 text-xs text-slate-500">HTTP targets that are not linked to an asset</p>
      </div>
      <div className="divide-y divide-slate-100">
        {checks.map((check) => {
          const target = targetsById.get(check.healthCheckTargetId);
          const summaryCodesMatch =
            check.actualStatus !== null &&
            Number(check.actualStatus) === Number(check.expectedStatus);
          const status: DashboardHealthStatus = target
            ? target.enabled && !target.archivedAt
              ? getHealthResultStatus(target)
              : "PAUSED"
            : check.status === "UNAVAILABLE" && summaryCodesMatch
              ? "UNKNOWN"
              : check.status;
          const actualStatus = target ? (target.latest?.statusCode ?? null) : check.actualStatus;
          const expectedStatus = target?.expectedStatus ?? check.expectedStatus;

          return (
            <div key={check.healthCheckTargetId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link href={`/health-checks/${check.healthCheckTargetId}`} className="text-sm font-medium text-blue-700 hover:underline">{check.name}</Link>
                <p className="truncate text-xs text-slate-500" title={check.url}>{check.url}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded px-2 py-1 font-medium ${statusClass[status]}`}>{status === "AVAILABLE" ? "HEALTHY" : status.replaceAll("_", " ")}</span>
                <span className="text-slate-500">HTTP {actualStatus ?? "—"} / expected {expectedStatus}</span>
                {check.activeAlerts > 0 && <span className={check.highestAlertSeverity === "CRITICAL" ? "font-medium text-rose-700" : "font-medium text-amber-700"}>{check.activeAlerts} active alert{check.activeAlerts === 1 ? "" : "s"}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {standaloneAlerts.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active standalone alerts ({standaloneAlerts.length})</h3>
          <ul className="mt-2 space-y-2">
            {standaloneAlerts.map((alert) => (
              <li key={alert.alertId} className="flex flex-wrap items-center gap-2 text-xs">
                <span className={alert.severity === "CRITICAL" ? "font-semibold text-rose-700" : "font-semibold text-amber-700"}>{alert.severity}</span>
                <Link href={`/alerts/${alert.alertId}`} className="min-w-0 text-blue-700 hover:underline">{alert.message}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

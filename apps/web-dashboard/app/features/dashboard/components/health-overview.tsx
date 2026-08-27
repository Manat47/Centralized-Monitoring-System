"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import type { HealthCheckTarget } from "@/app/features/health-checks/types/health-check";
import { getHealthResultStatus } from "@/app/features/health-checks/components/health-check-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCheckedAt(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function HealthOverviewSkeleton() {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-52 animate-pulse rounded bg-slate-100" />
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1.5fr_0.8fr_0.5fr] items-center gap-4 px-5 py-4"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthOverview() {
  const {
    data: targets,
    isLoading: targetsLoading,
    isError: targetsError,
  } = useHealthCheckTargets();

  const { data: assets } = useAssets();

  const enabledTargets = (targets ?? []).filter(
    (target) => target.enabled && !target.archivedAt,
  );

  const assetNames = new Map(
    (assets ?? []).map((asset) => [asset.assetId, asset.name]),
  );

  const rows = enabledTargets.map((target: HealthCheckTarget) => {
    const latest = target.latest;
    const status = getHealthResultStatus(target);

    return {
      target,
      latest,
      status,
      assetName: assetNames.get(target.assetId) ?? "Unknown asset",
    };
  });

  if (targetsLoading) {
    return <HealthOverviewSkeleton />;
  }

  if (targetsError) {
    return (
      <Card className="border-rose-200 shadow-none">
        <CardContent className="py-10 text-center text-sm text-rose-700">
          Failed to load health checks
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Activity className="size-4 text-blue-600" />
          Health Overview
        </CardTitle>

        <p className="mt-1 text-xs text-slate-500">
          Latest result from enabled endpoint health checks
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No health checks configured
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Enable a health check target to see endpoint status.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="text-xs">Asset</TableHead>

                <TableHead className="text-xs">Endpoint</TableHead>

                <TableHead className="w-32 text-xs">Status</TableHead>

                <TableHead className="w-20 text-xs">HTTP</TableHead>

                <TableHead className="w-28 text-right text-xs">
                  Response
                </TableHead>

                <TableHead className="w-28 text-right text-xs">
                  Checked
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map(({ target, latest, status, assetName }) => (
                <TableRow
                  key={target.healthCheckTargetId}
                  className="group transition-colors duration-150 ease-out hover:bg-slate-50/80"
                >
                  <TableCell>
                    <p className="text-sm font-medium text-slate-900 transition-colors duration-150 group-hover:text-slate-950">
                      {assetName}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p
                      title={target.url}
                      className="max-w-80 truncate text-xs text-slate-600 transition-colors duration-150 group-hover:text-slate-800"
                    >
                      {target.url}
                    </p>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full",
                          status === "AVAILABLE"
                            ? "bg-emerald-50"
                            : status === "UNAVAILABLE"
                              ? "bg-rose-50"
                              : status === "STALE"
                                ? "bg-amber-50"
                                : "bg-slate-100",
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            status === "AVAILABLE"
                              ? "bg-emerald-500"
                              : status === "UNAVAILABLE"
                                ? "bg-rose-500"
                                : status === "STALE"
                                  ? "bg-amber-500"
                                  : "bg-slate-400",
                          )}
                        />
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs tabular-nums text-slate-600">
                    {latest?.statusCode ?? "—"}
                  </TableCell>

                  <TableCell className="text-right text-xs tabular-nums text-slate-600">
                    {latest ? `${latest.responseTimeMs} ms` : "—"}
                  </TableCell>

                  <TableCell className="text-right text-xs tabular-nums text-slate-500">
                    {formatCheckedAt(latest?.timestamp ?? target.lastCheckedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

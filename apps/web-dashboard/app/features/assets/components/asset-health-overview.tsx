"use client";

import { useQueries } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { getLatestHealthCheck } from "@/app/features/health-checks/api/get-latest-health-check";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import type { LatestHealthCheck } from "@/app/features/health-checks/types/health-check";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssetHealthOverviewProps {
  assetId: string;
}

type HealthStatus = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";

function getHealthStatus(
  latest: LatestHealthCheck | null | undefined,
): HealthStatus {
  if (!latest) {
    return "UNKNOWN";
  }

  if (
    latest.statusCode !== null &&
    latest.statusCode >= 200 &&
    latest.statusCode < 300
  ) {
    return "AVAILABLE";
  }

  return "UNAVAILABLE";
}

function formatCheckedAt(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AssetHealthOverview({ assetId }: AssetHealthOverviewProps) {
  const targetsQuery = useHealthCheckTargets();

  const assetTargets = (targetsQuery.data ?? []).filter(
    (target) => target.assetId === assetId,
  );

  const latestQueries = useQueries({
    queries: assetTargets.map((target) => ({
      queryKey: ["health-check-targets", target.healthCheckTargetId, "latest"],

      queryFn: () => getLatestHealthCheck(target.healthCheckTargetId),

      refetchInterval: 15_000,
    })),
  });

  if (targetsQuery.isLoading) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading health checks...
        </CardContent>
      </Card>
    );
  }

  if (targetsQuery.isError) {
    return (
      <Card className="border-rose-200 shadow-none">
        <CardContent className="py-12 text-center text-sm text-rose-600">
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
          Health Checks
        </CardTitle>

        <p className="mt-1 text-xs text-slate-500">
          HTTP endpoint availability for this asset
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {assetTargets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-900">
              No health checks configured
            </p>

            <p className="mt-1 text-xs text-slate-500">
              This asset does not have a health check target.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="text-xs">Endpoint</TableHead>

                <TableHead className="w-28 text-xs">Check</TableHead>

                <TableHead className="w-32 text-xs">Latest Result</TableHead>

                <TableHead className="w-20 text-xs">HTTP</TableHead>

                <TableHead className="w-28 text-right text-xs">
                  Response
                </TableHead>

                <TableHead className="w-40 text-right text-xs">
                  Checked
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {assetTargets.map((target, index) => {
                const latest = latestQueries[index]?.data;

                const status = getHealthStatus(latest);

                return (
                  <TableRow key={target.healthCheckTargetId}>
                    <TableCell>
                      <p
                        title={target.url}
                        className="max-w-lg truncate text-xs font-medium text-slate-700"
                      >
                        {target.url}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            target.enabled
                              ? "size-2 rounded-full bg-blue-500"
                              : "size-2 rounded-full bg-slate-300"
                          }
                        />

                        <span className="text-xs text-slate-600">
                          {target.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            status === "AVAILABLE"
                              ? "size-2 rounded-full bg-emerald-500"
                              : status === "UNAVAILABLE"
                                ? "size-2 rounded-full bg-rose-500"
                                : "size-2 rounded-full bg-slate-300"
                          }
                        />

                        <span className="text-xs font-medium text-slate-700">
                          {status === "AVAILABLE"
                            ? "Available"
                            : status === "UNAVAILABLE"
                              ? "Unavailable"
                              : "Unknown"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {latest?.statusCode ?? "—"}
                    </TableCell>

                    <TableCell className="text-right text-xs text-slate-600">
                      {latest ? `${latest.responseTimeMs} ms` : "—"}
                    </TableCell>

                    <TableCell className="text-right text-xs text-slate-500">
                      {formatCheckedAt(
                        latest?.timestamp ?? target.lastCheckedAt,
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

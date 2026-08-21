"use client";

import { useQueries } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { getLatestHealthCheck } from "@/app/features/health-checks/api/get-latest-health-check";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import type {
  HealthCheckTarget,
  LatestHealthCheck,
} from "@/app/features/health-checks/types/health-check";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function HealthOverview() {
  const {
    data: targets,
    isLoading: targetsLoading,
    isError: targetsError,
  } = useHealthCheckTargets();

  const { data: assets } = useAssets();

  const enabledTargets = (targets ?? []).filter((target) => target.enabled);

  const latestQueries = useQueries({
    queries: enabledTargets.map((target) => ({
      queryKey: ["health-check-targets", target.healthCheckTargetId, "latest"],
      queryFn: () => getLatestHealthCheck(target.healthCheckTargetId),
      refetchInterval: 15_000,
    })),
  });

  const assetNames = new Map(
    (assets ?? []).map((asset) => [asset.assetId, asset.name]),
  );

  const rows = enabledTargets.map((target: HealthCheckTarget, index) => {
    const latest = latestQueries[index]?.data;
    const status = getHealthStatus(latest);

    return {
      target,
      latest,
      status,
      assetName: assetNames.get(target.assetId) ?? "Unknown asset",
    };
  });

  if (targetsLoading) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Loading health checks...
        </CardContent>
      </Card>
    );
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
                <TableRow key={target.healthCheckTargetId}>
                  <TableCell>
                    <p className="text-sm font-medium text-slate-900">
                      {assetName}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p
                      title={target.url}
                      className="max-w-80 truncate text-xs text-slate-600"
                    >
                      {target.url}
                    </p>
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

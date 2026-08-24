"use client";

import { Activity } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import type {
  HealthCheckTarget,
} from "@/app/features/health-checks/types/health-check";
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
                              : status === "STALE"
                                ? "size-2 rounded-full bg-amber-500"
                              : "size-2 rounded-full bg-slate-300"
                        }
                      />

                      <span className="text-xs font-medium text-slate-700">
                        {status === "AVAILABLE"
                          ? "Available"
                          : status === "UNAVAILABLE"
                            ? "Unavailable"
                            : status === "STALE"
                              ? "Stale"
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

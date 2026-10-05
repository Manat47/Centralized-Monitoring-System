"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Eye, LoaderCircle } from "lucide-react";

import { useAcknowledgeAlert } from "@/app/features/alerts/api/use-alert-actions";
import { useAlerts } from "@/app/features/alerts/api/use-alerts";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { useAuth } from "@/app/features/auth/components/auth-provider";
import { useHealthCheckTargets } from "@/app/features/health-checks/api/use-health-check-targets";
import { useMonitoringTargets } from "@/app/features/monitoring-targets/api/use-monitoring-targets";
import { HostInspectionDrawer } from "@/app/features/monitoring-targets/components/host-inspection-drawer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatTriggeredAt(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays}d ago`;
}

function NeedsAttentionSkeleton() {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-64 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
      </CardHeader>

      <CardContent className="p-0">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[7rem_1fr_7rem_1.5fr_7rem] items-center gap-4 px-5 py-4"
            >
              <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />

              <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />

              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />

              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />

              <div className="ml-auto h-3 w-14 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function NeedsAttention() {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const acknowledgeMutation = useAcknowledgeAlert();
  const {
    data: alertsData,
    isLoading,
    isError,
    error,
  } = useAlerts({
    status: "TRIGGERED",
    page: 1,
    limit: 5,
  });

  const { data: assets } = useAssets();
  const healthTargets = useHealthCheckTargets(selectedAssetId !== null);
  const monitoringTargets = useMonitoringTargets(false, selectedAssetId !== null);
  const selectedAsset = assets?.find((asset) => asset.assetId === selectedAssetId) ?? null;
  const canAcknowledge = user?.role === "ADMIN" || user?.role === "OPERATOR";

  const assetNames = new Map(
    (assets ?? []).map((asset) => [asset.assetId, asset.name]),
  );

  if (isLoading) {
    return <NeedsAttentionSkeleton />;
  }

  if (isError) {
    return (
      <Card className="border-rose-200 shadow-none">
        <CardContent className="flex min-h-28 items-center justify-center py-5 text-center">
          <p className="text-sm font-medium text-rose-700">
            Failed to load alerts
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const alerts = alertsData?.items ?? [];

  return (
    <>
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="size-4 text-amber-600" />
            Top 5 Unacknowledged Alerts
          </CardTitle>

          <p className="mt-1 text-xs text-slate-500">
            Most recent firing alerts requiring operator attention
          </p>
        </div>

        <Link
          href="/alerts"
          className={cn(
            buttonVariants({
              variant: "ghost",
              size: "sm",
            }),
            "group gap-1 text-xs",
          )}
        >
          View all
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.75" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center px-6 py-8 text-center">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50">
              <AlertTriangle className="size-4 text-emerald-600" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-900">
              No alerts need attention
            </p>

            <p className="mt-1 text-xs text-slate-500">
              There are currently no triggered alerts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto"><Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-28 text-xs">Severity</TableHead>

                <TableHead className="text-xs">Resource</TableHead>

                <TableHead className="w-28 text-xs">Metric</TableHead>

                <TableHead className="text-xs">Message</TableHead>

                <TableHead className="w-28 text-right text-xs">
                  Triggered
                </TableHead>
                <TableHead className="w-44 text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {alerts.map((alert) => (
                <TableRow
                  key={alert.alertId}
                  className="
      group
      transition-colors duration-150 ease-out
      hover:bg-slate-50/80
    "
                >
                  <TableCell>
                    <Badge
                      variant={
                        alert.severity === "CRITICAL"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div>
                      <Link href={`/alerts/${alert.alertId}`} className="text-sm font-medium text-blue-700 hover:underline">
                        {alert.assetId
                          ? (assetNames.get(alert.assetId) ?? alert.assetId)
                          : typeof alert.context?.url === "string"
                            ? alert.context.url
                            : alert.sourceId}
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm font-medium text-slate-700">
                    {alert.metricType}
                  </TableCell>

                  <TableCell className="max-w-md">
                    <p className="truncate text-sm text-slate-700">
                      {alert.message}
                    </p>
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500">
                    {formatTriggeredAt(alert.triggeredAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {alert.assetId ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAssetId(alert.assetId)}><Eye className="size-3.5" /> Inspect</Button>
                      ) : alert.sourceType === "HEALTH_CHECK" ? (
                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/health-checks/${alert.sourceId}`} />}><Eye className="size-3.5" /> View check</Button>
                      ) : null}
                      {canAcknowledge && <Button type="button" size="sm" disabled={acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate(alert.alertId, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }); } })}>
                        {acknowledgeMutation.isPending && acknowledgeMutation.variables === alert.alertId ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Acknowledge
                      </Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
        {acknowledgeMutation.isError && <p role="alert" className="px-5 py-2 text-xs text-rose-700">{acknowledgeMutation.error instanceof Error ? acknowledgeMutation.error.message : "Could not acknowledge alert"}</p>}
      </CardContent>
    </Card>
    <HostInspectionDrawer
      key={selectedAsset?.assetId ?? "closed"}
      asset={selectedAsset}
      healthChecks={(healthTargets.data ?? []).filter((target) => target.assetId === selectedAssetId)}
      hasMetricTarget={(monitoringTargets.data ?? []).some((target) => target.assetId === selectedAssetId && target.monitoringType === "NODE_EXPORTER" && target.monitoringEnabled && !target.archivedAt)}
      onClose={() => setSelectedAssetId(null)}
    />
    </>
  );
}

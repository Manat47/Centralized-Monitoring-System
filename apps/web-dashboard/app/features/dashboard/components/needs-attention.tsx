"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { useAlerts } from "@/app/features/alerts/api/use-alerts";
import { useAssets } from "@/app/features/assets/api/use-assets";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle className="size-4 text-amber-600" />
            Needs Attention
          </CardTitle>

          <p className="mt-1 text-xs text-slate-500">
            Unacknowledged alerts requiring operator attention
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
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-28 text-xs">Severity</TableHead>

                <TableHead className="text-xs">Resource</TableHead>

                <TableHead className="w-28 text-xs">Metric</TableHead>

                <TableHead className="text-xs">Message</TableHead>

                <TableHead className="w-28 text-right text-xs">
                  Triggered
                </TableHead>
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
                      <p className="text-sm font-medium text-slate-900 transition-colors duration-150 group-hover:text-slate-950">
                        {assetNames.get(alert.assetId) ?? "Unknown asset"}
                      </p>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

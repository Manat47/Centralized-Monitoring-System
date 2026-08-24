"use client";

import { Bell } from "lucide-react";

import { useAlerts } from "@/app/features/alerts/api/use-alerts";
import type {
  AlertResolutionReason,
  AlertSeverity,
  AlertStatus,
} from "@/app/features/alerts/types/alert";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssetAlertsOverviewProps {
  assetId: string;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(1);
}

function formatTriggeredAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSeverityClass(severity: AlertSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusClass(status: AlertStatus): string {
  switch (status) {
    case "TRIGGERED":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "ACKNOWLEDGED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "RESOLVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "CLOSED":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatStatus(status: AlertStatus): string {
  switch (status) {
    case "TRIGGERED":
      return "Triggered";

    case "ACKNOWLEDGED":
      return "Acknowledged";

    case "RESOLVED":
      return "Resolved";

    case "CLOSED":
      return "Closed";
  }
}

function formatResolutionReason(
  reason: AlertResolutionReason | null,
): string {
  switch (reason) {
    case "METRIC_RECOVERED":
      return "Metric recovered";

    case "ASSET_DEACTIVATED":
      return "Asset deactivated";

    case null:
      return "—";
  }
}

export function AssetAlertsOverview({ assetId }: AssetAlertsOverviewProps) {
  const alertsQuery = useAlerts({
    assetId,
    page: 1,
    limit: 20,
  });

  if (alertsQuery.isLoading) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Loading alerts...
        </CardContent>
      </Card>
    );
  }

  if (alertsQuery.isError) {
    return (
      <Card className="border-rose-200 shadow-none">
        <CardContent className="py-12 text-center text-sm text-rose-600">
          Failed to load alerts
        </CardContent>
      </Card>
    );
  }

  const alerts = alertsQuery.data?.items ?? [];

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bell className="size-4 text-blue-600" />
          Alerts
        </CardTitle>

        <p className="mt-1 text-xs text-slate-500">
          Alert history associated with this asset
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-900">
              No alerts for this asset
            </p>

            <p className="mt-1 text-xs text-slate-500">
              No alert events have been recorded.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="text-xs">Severity</TableHead>

                <TableHead className="text-xs">Metric</TableHead>

                <TableHead className="text-right text-xs">Actual</TableHead>

                <TableHead className="text-right text-xs">Threshold</TableHead>

                <TableHead className="text-xs">Status</TableHead>

                <TableHead className="text-xs">Reason</TableHead>

                <TableHead className="text-right text-xs">Triggered</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.alertId}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getSeverityClass(alert.severity)}
                    >
                      {alert.severity === "CRITICAL" ? "Critical" : "Warning"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm font-medium text-slate-800">
                    {alert.metricType}
                  </TableCell>

                  <TableCell className="text-right text-sm text-slate-700">
                    {formatNumber(alert.actualValue)}
                  </TableCell>

                  <TableCell className="text-right text-sm text-slate-700">
                    {formatNumber(alert.thresholdValue)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusClass(alert.status)}
                    >
                      {formatStatus(alert.status)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {formatResolutionReason(alert.resolutionReason)}
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

"use client";

import Link from "next/link";

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

import { useAlerts } from "@/app/features/alerts/api/use-alerts";
import type {
  AlertSeverity,
  AlertStatus,
} from "@/app/features/alerts/types/alert";

function getStatusVariant(
  status: AlertStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "TRIGGERED":
      return "destructive";

    case "ACKNOWLEDGED":
      return "secondary";

    case "RESOLVED":
      return "default";

    case "CLOSED":
      return "outline";
  }
}

function getSeverityVariant(
  severity: AlertSeverity,
): "default" | "destructive" | "outline" {
  return severity === "CRITICAL" ? "destructive" : "outline";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecentAlerts() {
  const { data, isLoading, isError, error, isFetching } = useAlerts({
    page: 1,
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading recent alerts...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load recent alerts
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const alerts = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Recent Alerts</CardTitle>

          {isFetching && (
            <p className="mt-1 text-xs text-muted-foreground">Updating...</p>
          )}
        </div>

        <Link
          href="/alerts"
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "sm",
            }),
          )}
        >
          View all
        </Link>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Triggered at</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No alerts found.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.alertId}>
                  <TableCell>
                    <Badge variant={getStatusVariant(alert.status)}>
                      {alert.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getSeverityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </TableCell>

                  <TableCell>{alert.metricType}</TableCell>

                  <TableCell className="max-w-md truncate">
                    {alert.message}
                  </TableCell>

                  <TableCell>{formatDate(alert.triggeredAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAcknowledgeAlert, useCloseAlert } from "../api/use-alert-actions";
import { useAlerts } from "../api/use-alerts";
import type { AlertSeverity, AlertStatus } from "../types/alert";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    timeStyle: "medium",
  }).format(new Date(value));
}

export function AlertsTable() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | AlertStatus>("ALL");
  const [severity, setSeverity] = useState<"ALL" | AlertSeverity>("ALL");
  const acknowledgeMutation = useAcknowledgeAlert();
  const closeMutation = useCloseAlert();

  const { data, isLoading, isError, error, isFetching } = useAlerts({
    page,
    limit: 20,
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity,
  });
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading alerts...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">Failed to load alerts</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Alert list ({data?.total ?? 0})
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ALL" | AlertStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="TRIGGERED">Triggered</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severity}
            onValueChange={(value) => {
              setSeverity(value as "ALL" | AlertSeverity);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status === "ALL" && severity === "ALL"}
            onClick={() => {
              setStatus("ALL");
              setSeverity("ALL");
              setPage(1);
            }}
          >
            Clear filters
          </Button>

          {isFetching && (
            <span className="text-sm text-muted-foreground">Updating...</span>
          )}
        </div>
        {acknowledgeMutation.isError && (
          <p className="mb-4 text-sm text-destructive">
            {acknowledgeMutation.error instanceof Error
              ? acknowledgeMutation.error.message
              : "Failed to acknowledge alert"}
          </p>
        )}

        {closeMutation.isError && (
          <p className="mb-4 text-sm text-destructive">
            {closeMutation.error instanceof Error
              ? closeMutation.error.message
              : "Failed to close alert"}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Triggered At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No alerts found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((alert) => (
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

                  <TableCell className="font-mono text-xs">
                    {alert.assetId}
                  </TableCell>

                  <TableCell>{alert.metricType}</TableCell>

                  <TableCell>{alert.actualValue ?? "-"}</TableCell>

                  <TableCell>{alert.thresholdValue}</TableCell>

                  <TableCell>{formatDate(alert.triggeredAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {alert.status === "TRIGGERED" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            acknowledgeMutation.isPending ||
                            closeMutation.isPending
                          }
                          onClick={() => {
                            acknowledgeMutation.mutate(alert.alertId);
                          }}
                        >
                          {acknowledgeMutation.isPending &&
                          acknowledgeMutation.variables === alert.alertId
                            ? "Acknowledging..."
                            : "Acknowledge"}
                        </Button>
                      )}

                      {alert.status === "RESOLVED" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            acknowledgeMutation.isPending ||
                            closeMutation.isPending
                          }
                          onClick={() => {
                            closeMutation.mutate(alert.alertId);
                          }}
                        >
                          {closeMutation.isPending &&
                          closeMutation.variables === alert.alertId
                            ? "Closing..."
                            : "Close"}
                        </Button>
                      )}

                      {(alert.status === "ACKNOWLEDGED" ||
                        alert.status === "CLOSED") && (
                        <span className="text-sm text-muted-foreground">
                          No action
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data?.page ?? page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

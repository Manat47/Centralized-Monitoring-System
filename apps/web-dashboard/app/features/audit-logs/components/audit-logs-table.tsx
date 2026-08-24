"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuditLogs } from "../api/use-audit-logs";
import type {
  AuditAction,
  AuditActorRole,
  AuditResourceType,
  AuditResult,
} from "../types/audit-log";

const auditActions: AuditAction[] = [
  "USER_CREATED",
  "USER_UPDATED",
  "USER_STATUS_CHANGED",
  "ASSET_CREATED",
  "ASSET_UPDATED",
  "ASSET_STATUS_CHANGED",
  "ASSET_DEACTIVATED",
  "MONITORING_TARGET_CREATED",
  "MONITORING_TARGET_VERIFIED",
  "MONITORING_TARGET_ENABLED",
  "MONITORING_TARGET_DISABLED",
  "METRIC_RULE_CREATED",
  "ALERT_ACKNOWLEDGED",
  "ALERT_CLOSED",
];

const resourceTypes: AuditResourceType[] = [
  "USER",
  "ASSET",
  "MONITORING_TARGET",
  "METRIC_RULE",
  "ALERT",
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getResultVariant(
  result: AuditResult,
): "default" | "destructive" {
  return result === "SUCCESS" ? "default" : "destructive";
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

export function AuditLogsTable() {
  const [page, setPage] = useState(1);
  const [actorRole, setActorRole] = useState<"ALL" | AuditActorRole>("ALL");
  const [action, setAction] = useState<"ALL" | AuditAction>("ALL");
  const [resourceType, setResourceType] = useState<"ALL" | AuditResourceType>(
    "ALL",
  );
  const [result, setResult] = useState<"ALL" | AuditResult>("ALL");
  const [actorUserId, setActorUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading, isError, error, isFetching } = useAuditLogs({
    page,
    limit: 20,
    actorUserId: actorUserId.trim() || undefined,
    actorRole: actorRole === "ALL" ? undefined : actorRole,
    action: action === "ALL" ? undefined : action,
    resourceType: resourceType === "ALL" ? undefined : resourceType,
    result: result === "ALL" ? undefined : result,
    from: toIsoDateTime(from),
    to: toIsoDateTime(to),
  });

  const totalPages = Math.max(
    Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)),
    1,
  );
  const hasFilters =
    actorRole !== "ALL" ||
    action !== "ALL" ||
    resourceType !== "ALL" ||
    result !== "ALL" ||
    actorUserId.trim() !== "" ||
    from !== "" ||
    to !== "";

  function resetFilters(): void {
    setActorRole("ALL");
    setAction("ALL");
    setResourceType("ALL");
    setResult("ALL");
    setActorUserId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading audit logs...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load audit logs
          </p>

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
          Audit log list ({data?.total ?? 0})
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            value={actorRole}
            onValueChange={(value) => {
              setActorRole(value as "ALL" | AuditActorRole);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Actor role" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="OPERATOR">Operator</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={resourceType}
            onValueChange={(value) => {
              setResourceType(value as "ALL" | AuditResourceType);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Resource type" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All resources</SelectItem>
              {resourceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={action}
            onValueChange={(value) => {
              setAction(value as "ALL" | AuditAction);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              {auditActions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={result}
            onValueChange={(value) => {
              setResult(value as "ALL" | AuditResult);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Result" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All results</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="FAILURE">Failure</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={actorUserId}
            onChange={(event) => {
              setActorUserId(event.target.value);
              setPage(1);
            }}
            placeholder="Actor user ID"
          />

          <Input
            type="datetime-local"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />

          <Input
            type="datetime-local"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasFilters}
              onClick={resetFilters}
            >
              Clear filters
            </Button>

            {isFetching && (
              <span className="text-sm text-muted-foreground">Updating...</span>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Result</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>Occurred At</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((auditLog) => (
                <TableRow key={auditLog.auditLogId}>
                  <TableCell>
                    <Badge variant={getResultVariant(auditLog.result)}>
                      {auditLog.result}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">{auditLog.actorRole}</Badge>
                  </TableCell>

                  <TableCell>{auditLog.action}</TableCell>

                  <TableCell>{auditLog.resourceType}</TableCell>

                  <TableCell className="font-mono text-xs">
                    {auditLog.actorUserId}
                  </TableCell>

                  <TableCell className="font-mono text-xs">
                    {auditLog.resourceId}
                  </TableCell>

                  <TableCell>{formatDate(auditLog.occurredAt)}</TableCell>
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

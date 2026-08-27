"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ArrowUpRight, Eye, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { useAuditLogs } from "../api/use-audit-logs";
import type {
  AuditAction,
  AuditActorRole,
  AuditLog,
  AuditResourceType,
  AuditResult,
} from "../types/audit-log";

const auditActions: AuditAction[] = [
  "USER_CREATED",
  "USER_INVITED",
  "USER_INVITATION_RESENT",
  "USER_INVITATION_REVOKED",
  "USER_INVITATION_ACCEPTED",
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
  "METRIC_RULE_UPDATED",
  "METRIC_RULE_ENABLED",
  "METRIC_RULE_DISABLED",
  "METRIC_RULE_ARCHIVED",
  "HEALTH_CHECK_TARGET_CREATED",
  "HEALTH_CHECK_TARGET_UPDATED",
  "HEALTH_CHECK_TARGET_ENABLED",
  "HEALTH_CHECK_TARGET_DISABLED",
  "HEALTH_CHECK_TARGET_CHECKED",
  "HEALTH_CHECK_TARGET_ARCHIVED",
  "ALERT_ACKNOWLEDGED",
  "ALERT_CLOSED",
  "REPORT_GENERATED",
  "NOTIFICATION_RECIPIENTS_UPDATED",
  "NOTIFICATION_TEST_SENT",
];

const resourceTypes: AuditResourceType[] = [
  "USER",
  "ASSET",
  "MONITORING_TARGET",
  "METRIC_RULE",
  "HEALTH_CHECK_TARGET",
  "ALERT",
  "REPORT",
  "NOTIFICATION_SETTINGS",
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => {
      const acronyms = [
        "api",
        "cpu",
        "http",
        "https",
        "id",
        "ip",
        "rx",
        "tx",
        "url",
      ];

      if (acronyms.includes(part)) {
        return part.toUpperCase();
      }

      return part === "ms"
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function formatMetadataLabel(key: string): string {
  const labels: Record<string, string> = {
    responseTimeMs: "Response time (ms)",
    statusCode: "Status code",
  };

  return labels[key] ?? formatLabel(key);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function shortId(value: string | null): string {
  return value ? value.slice(0, 8) : "-";
}

function getResourceHref(log: AuditLog): string | null {
  if (!log.resourceId) return null;

  switch (log.resourceType) {
    case "ASSET":
      return `/assets/${log.resourceId}`;
    case "HEALTH_CHECK_TARGET":
      return `/health-checks/${log.resourceId}`;
    case "ALERT":
      return `/alerts/${log.resourceId}`;
    case "MONITORING_TARGET":
      return "/monitoring-targets";
    case "METRIC_RULE":
      return "/metric-rules";
    case "USER":
      return "/users";
    default:
      return null;
  }
}

function AuditDetailDialog({
  log,
  onOpenChange,
}: {
  log: AuditLog | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  const resourceHref = getResourceHref(log);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formatLabel(log.action)}</DialogTitle>
          <DialogDescription>{formatDate(log.occurredAt)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-6 gap-y-4 border-y py-4 sm:grid-cols-2">
          <Detail label="Result">
            <Badge variant={log.result === "SUCCESS" ? "default" : "destructive"}>
              {formatLabel(log.result)}
            </Badge>
          </Detail>
          <Detail label="Source" value={log.sourceService} />
          <Detail
            label="Actor"
            value={log.actorEmail ?? log.actorUserId}
            secondary={log.actorEmail ? log.actorUserId : log.actorRole}
          />
          <Detail
            label="Resource"
            value={log.resourceName ?? formatLabel(log.resourceType)}
            secondary={log.resourceId ?? undefined}
          />
          {log.requestId && <Detail label="Request ID" value={log.requestId} />}
          <Detail label="Event ID" value={log.eventId} />
        </div>

        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Event details</h3>
            <dl className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
              {Object.entries(log.metadata).map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    {formatMetadataLabel(key)}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-all font-mono text-xs">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {(log.errorCode || log.errorMessage) && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="font-medium text-destructive">
              {log.errorCode ?? "Operation failed"}
            </p>
            {log.errorMessage && (
              <p className="mt-1 text-sm text-destructive">{log.errorMessage}</p>
            )}
          </div>
        )}

        {resourceHref && (
          <Link
            href={resourceHref}
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open resource <ArrowUpRight className="size-4" />
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  secondary,
  children,
}: {
  label: string;
  value?: string;
  secondary?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children ?? <p className="mt-1 break-all text-sm font-medium">{value}</p>}
      {secondary && (
        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
          {secondary}
        </p>
      )}
    </div>
  );
}

function toIsoDateTime(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function AuditLogsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [actorRole, setActorRole] = useState<"ALL" | AuditActorRole>("ALL");
  const [action, setAction] = useState<"ALL" | AuditAction>("ALL");
  const [resourceType, setResourceType] = useState<"ALL" | AuditResourceType>("ALL");
  const [result, setResult] = useState<"ALL" | AuditResult>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isError, error, isFetching } = useAuditLogs({
    page,
    limit: 20,
    search: deferredSearch || undefined,
    actorRole: actorRole === "ALL" ? undefined : actorRole,
    action: action === "ALL" ? undefined : action,
    resourceType: resourceType === "ALL" ? undefined : resourceType,
    result: result === "ALL" ? undefined : result,
    from: toIsoDateTime(from),
    to: toIsoDateTime(to),
  });

  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)), 1);
  const hasFilters = Boolean(
    search || actorRole !== "ALL" || action !== "ALL" ||
      resourceType !== "ALL" || result !== "ALL" || from || to,
  );

  function resetFilters(): void {
    setSearch("");
    setActorRole("ALL");
    setAction("ALL");
    setResourceType("ALL");
    setResult("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  }

  if (isLoading) {
    return <AuditLogsSkeleton />;
  }

  if (isError) {
    return (
      <Card><CardContent className="py-10 text-center">
        <p className="font-medium text-destructive">Failed to load audit logs</p>
        <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
      </CardContent></Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <div className="relative w-full min-w-0 flex-1 sm:min-w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search actor, action, resource, or ID"
                className="pl-9"
              />
            </div>
            <Select value={resourceType} onValueChange={(value) => { setResourceType(value as typeof resourceType); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue>
                  {resourceType === "ALL"
                    ? "All resources"
                    : formatLabel(resourceType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent><SelectItem value="ALL">All resources</SelectItem>{resourceTypes.map((item) => <SelectItem key={item} value={item}>{formatLabel(item)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={action} onValueChange={(value) => { setAction(value as typeof action); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue>
                  {action === "ALL" ? "All actions" : formatLabel(action)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent><SelectItem value="ALL">All actions</SelectItem>{auditActions.map((item) => <SelectItem key={item} value={item}>{formatLabel(item)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={result} onValueChange={(value) => { setResult(value as typeof result); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue>
                  {result === "ALL" ? "All results" : formatLabel(result)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent><SelectItem value="ALL">All results</SelectItem><SelectItem value="SUCCESS">Success</SelectItem><SelectItem value="FAILURE">Failure</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <Select value={actorRole} onValueChange={(value) => { setActorRole(value as typeof actorRole); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue>
                  {actorRole === "ALL"
                    ? "All roles"
                    : formatLabel(actorRole)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent><SelectItem value="ALL">All roles</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="OPERATOR">Operator</SelectItem></SelectContent>
            </Select>
            <Input type="datetime-local" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="w-full sm:w-auto" aria-label="From time" />
            <Input type="datetime-local" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="w-full sm:w-auto" aria-label="To time" />
            <Button type="button" variant="outline" size="sm" disabled={!hasFilters} onClick={resetFilters}>Clear</Button>
            <span className={cn("ml-auto text-sm text-muted-foreground", isFetching && "animate-pulse")}>
              {isFetching
                ? "Updating..."
                : `${data?.total ?? 0} ${(data?.total ?? 0) === 1 ? "event" : "events"}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader><TableRow>
                <TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Result</TableHead><TableHead>Source</TableHead><TableHead className="w-12"><span className="sr-only">Details</span></TableHead>
              </TableRow></TableHeader>
              <TableBody className={cn("transition-opacity duration-150", isFetching && "opacity-70")}>
                {data?.items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No audit events found.</TableCell></TableRow>
                ) : data?.items.map((log) => (
                  <TableRow key={log.auditLogId} className="transition-colors duration-150">
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(log.occurredAt)}</TableCell>
                    <TableCell><p className="max-w-56 truncate text-sm font-medium">{log.actorEmail ?? shortId(log.actorUserId)}</p><p className="text-xs text-muted-foreground">{formatLabel(log.actorRole)}</p></TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatLabel(log.action)}</TableCell>
                    <TableCell><p className="max-w-64 truncate text-sm font-medium">{log.resourceName ?? formatLabel(log.resourceType)}</p><p className="font-mono text-xs text-muted-foreground">{shortId(log.resourceId)}</p></TableCell>
                    <TableCell><Badge variant={log.result === "SUCCESS" ? "default" : "destructive"}>{formatLabel(log.result)}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{log.sourceService}</TableCell>
                    <TableCell><Button type="button" variant="ghost" size="icon-sm" title="View event details" onClick={() => setSelectedLog(log)}><Eye className="size-4" /><span className="sr-only">View event details</span></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-muted-foreground">Page {data?.page ?? page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuditDetailDialog log={selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }} />
    </>
  );
}

function AuditLogsSkeleton() {
  return <Card className="overflow-hidden border-slate-200 shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:flex-wrap"><Skeleton className="h-8 w-full sm:w-72" /><Skeleton className="h-8 w-full sm:w-48" /><Skeleton className="h-8 w-full sm:w-52" /><Skeleton className="h-8 w-full sm:w-36" /></div><div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:flex-wrap"><Skeleton className="h-8 w-full sm:w-40" /><Skeleton className="h-8 w-full sm:w-52" /><Skeleton className="h-8 w-full sm:w-52" /></div><Skeleton className="h-10 w-full rounded-none" />{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid h-16 grid-cols-[1fr_1.2fr_1fr_1.2fr_0.8fr] items-center gap-5 border-t border-slate-100 px-4"><Skeleton className="h-3 w-28" /><div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-16" /></div><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-32" /><Skeleton className="h-5 w-16" /></div>)}</CardContent></Card>;
}

"use client";

import { useMemo, useState } from "react";
import { Download, FilePlus2, LoaderCircle, RotateCcw } from "lucide-react";

import { useAssets } from "@/app/features/assets/api/use-assets";
import { useAuth } from "@/app/features/auth/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

import { useDownloadReport, useReports } from "../api/use-reports";
import type { ReportListItem, ReportStatus, ReportType } from "../types/report";
import { GenerateReportDialog } from "./generate-report-dialog";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function formatDateTime(value: string | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BANGKOK_TIME_ZONE,
  }).format(new Date(value));
}

function formatPeriod(start: string, end: string): string {
  const format = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: BANGKOK_TIME_ZONE,
  });

  return `${format.format(new Date(start))} - ${format.format(new Date(end))}`;
}

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "FAILED") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (status === "GENERATING") {
    return <Badge variant="secondary">Generating</Badge>;
  }

  return (
    <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700">
      Completed
    </Badge>
  );
}

export function ReportsTable() {
  const { user } = useAuth();
  const assetsQuery = useAssets();
  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState<"ALL" | ReportType>("ALL");
  const [status, setStatus] = useState<"ALL" | ReportStatus>("ALL");
  const [assetId, setAssetId] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seed, setSeed] = useState<ReportListItem | null>(null);
  const reportsQuery = useReports({
    reportType: reportType === "ALL" ? undefined : reportType,
    status: status === "ALL" ? undefined : status,
    assetId: assetId === "ALL" ? undefined : assetId,
    page,
    limit: 20,
  });
  const downloadMutation = useDownloadReport();
  const assetNames = useMemo(
    () =>
      new Map(
        assetsQuery.data?.map((asset) => [asset.assetId, asset.name]) ?? [],
      ),
    [assetsQuery.data],
  );
  const totalPages = Math.max(
    Math.ceil(
      (reportsQuery.data?.total ?? 0) / (reportsQuery.data?.limit ?? 20),
    ),
    1,
  );

  function openGenerate(report: ReportListItem | null = null): void {
    setSeed(report);
    setDialogOpen(true);
  }

  if (reportsQuery.isLoading) {
    return <ReportsSkeleton />;
  }

  if (reportsQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium text-destructive">Failed to load reports</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {reportsQuery.error instanceof Error
              ? reportsQuery.error.message
              : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <Select
              value={reportType}
              onValueChange={(value) => {
                setReportType((value ?? "ALL") as typeof reportType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue>
                  {reportType === "ALL"
                    ? "All report types"
                    : reportType === "MONTHLY"
                      ? "Monthly"
                      : "On demand"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All report types</SelectItem>
                <SelectItem value="ON_DEMAND">On demand</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus((value ?? "ALL") as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue>
                  {status === "ALL"
                    ? "All statuses"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="GENERATING">Generating</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={assetId}
              onValueChange={(value) => {
                setAssetId(value ?? "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue>
                  {assetId === "ALL"
                    ? "All scopes"
                    : (assetNames.get(assetId) ?? "Selected asset")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All scopes</SelectItem>
                {assetsQuery.data?.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className={cn("ml-auto text-sm text-muted-foreground", reportsQuery.isFetching && "animate-pulse")}>
              {reportsQuery.isFetching
                ? "Updating..."
                : `${reportsQuery.data?.total ?? 0} reports`}
            </span>
            {user?.role === "ADMIN" && (
              <Button type="button" onClick={() => openGenerate()}>
                <FilePlus2 className="size-4" />
                Generate report
              </Button>
            )}
          </div>

          {downloadMutation.error && (
            <p
              className="border-b bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {downloadMutation.error instanceof Error
                ? downloadMutation.error.message
                : "Report download failed"}
            </p>
          )}

          <div className="overflow-x-auto">
            <Table className="min-w-[940px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn("transition-opacity duration-150", reportsQuery.isFetching && "opacity-70")}>
                {reportsQuery.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportsQuery.data?.items.map((report) => (
                    <TableRow key={report.reportId} className="transition-colors duration-150">
                      <TableCell>
                        <p className="font-medium">
                          {report.reportType === "MONTHLY"
                            ? "Monthly report"
                            : "On-demand report"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {report.reportId.slice(0, 8)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {report.assetId
                          ? (assetNames.get(report.assetId) ??
                            report.assetId.slice(0, 8))
                          : "All assets"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatPeriod(report.periodStart, report.periodEnd)}
                      </TableCell>
                      <TableCell>
                        <p>
                          {report.generatedByEmail ??
                            (report.generatedBy
                              ? report.generatedBy.slice(0, 8)
                              : "System")}
                        </p>
                        {report.templateVersion && (
                          <p className="text-xs text-muted-foreground">
                            Template {report.templateVersion}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                        {report.failureMessage && (
                          <p
                            className="mt-1 max-w-56 text-xs text-destructive"
                            title={report.failureMessage}
                          >
                            {report.failureMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(report.generatedAt ?? report.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {report.status === "COMPLETED" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="Download PDF"
                              disabled={
                                downloadMutation.isPending &&
                                downloadMutation.variables === report.reportId
                              }
                              onClick={() =>
                                downloadMutation.mutate(report.reportId)
                              }
                            >
                              {downloadMutation.isPending &&
                              downloadMutation.variables === report.reportId ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <Download className="size-4" />
                              )}
                              <span className="sr-only">Download PDF</span>
                            </Button>
                          )}
                          {report.status === "FAILED" &&
                            user?.role === "ADMIN" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Generate again"
                                onClick={() => openGenerate(report)}
                              >
                                <RotateCcw className="size-4" />
                                <span className="sr-only">Generate again</span>
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-muted-foreground">
              Page {reportsQuery.data?.page ?? page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || reportsQuery.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || reportsQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerateReportDialog
        open={dialogOpen}
        seed={seed}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSeed(null);
        }}
      />
    </>
  );
}

function ReportsSkeleton() {
  return <Card className="overflow-hidden gap-0 py-0"><CardContent className="p-0"><div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:flex-wrap"><Skeleton className="h-8 w-full sm:w-44" /><Skeleton className="h-8 w-full sm:w-40" /><Skeleton className="h-8 w-full sm:w-52" /><Skeleton className="ml-auto h-8 w-full sm:w-36" /></div><Skeleton className="h-10 w-full rounded-none" />{Array.from({ length: 6 }).map((_, index) => <div key={index} className="grid h-16 grid-cols-[1.2fr_1fr_1.2fr_1fr_0.8fr] items-center gap-5 border-t border-slate-100 px-4"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-16" /></div><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-36" /><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-20" /></div>)}</CardContent></Card>;
}

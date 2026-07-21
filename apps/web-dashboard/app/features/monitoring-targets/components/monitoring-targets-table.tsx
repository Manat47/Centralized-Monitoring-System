"use client";

import { useMemo, useState } from "react";

import { useAssets } from "@/app/features/assets/api/use-assets";
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

import {
  useDisableMonitoringTarget,
  useEnableMonitoringTarget,
  useVerifyMonitoringTarget,
} from "../api/use-monitoring-target-actions";
import { useMonitoringTargets } from "../api/use-monitoring-targets";
import type {
  MonitoringTarget,
  VerificationStatus,
} from "../types/monitoring-target";
import Link from "next/link";

function getVerificationVariant(
  status: VerificationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "VERIFIED":
      return "default";

    case "FAILED":
      return "destructive";

    case "NOT_VERIFIED":
      return "secondary";
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getScrapeUrl(target: MonitoringTarget): string {
  return `http://${target.host}:${target.port}${target.path}`;
}

export function MonitoringTargetsTable() {
  /*
   * 1. State hooks
   */
  const [search, setSearch] = useState("");

  const [verificationStatus, setVerificationStatus] = useState<
    "ALL" | VerificationStatus
  >("ALL");

  const [monitoringStatus, setMonitoringStatus] = useState<
    "ALL" | "ENABLED" | "DISABLED"
  >("ALL");

  /*
   * 2. Query hooks
   */
  const targetsQuery = useMonitoringTargets();
  const assetsQuery = useAssets();

  /*
   * 3. Mutation hooks
   */
  const verifyMutation = useVerifyMonitoringTarget();
  const enableMutation = useEnableMonitoringTarget();
  const disableMutation = useDisableMonitoringTarget();

  /*
   * 4. Derived values
   */
  const isLoading = targetsQuery.isLoading || assetsQuery.isLoading;
  const isError = targetsQuery.isError || assetsQuery.isError;

  const targets = targetsQuery.data ?? [];
  const assets = assetsQuery.data ?? [];

  const assetNameById = useMemo(
    () => new Map(assets.map((asset) => [asset.assetId, asset.name])),
    [assets],
  );

  const filteredTargets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return targets.filter((target) => {
      const assetName = assetNameById.get(target.assetId) ?? "";
      const scrapeUrl = getScrapeUrl(target);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        assetName.toLowerCase().includes(normalizedSearch) ||
        target.host.toLowerCase().includes(normalizedSearch) ||
        scrapeUrl.toLowerCase().includes(normalizedSearch);

      const matchesVerification =
        verificationStatus === "ALL" ||
        target.verificationStatus === verificationStatus;

      const matchesMonitoring =
        monitoringStatus === "ALL" ||
        (monitoringStatus === "ENABLED" && target.monitoringEnabled) ||
        (monitoringStatus === "DISABLED" && !target.monitoringEnabled);

      return matchesSearch && matchesVerification && matchesMonitoring;
    });
  }, [targets, assetNameById, search, verificationStatus, monitoringStatus]);

  const actionError =
    verifyMutation.error ?? enableMutation.error ?? disableMutation.error;

  /*
   * 5. Conditional rendering
   *
   * ต้องอยู่หลัง Hooks ทั้งหมด
   */
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading monitoring targets...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const error = targetsQuery.error ?? assetsQuery.error;

    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load monitoring targets
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  /*
   * 6. Main render
   */
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Monitoring targets ({filteredTargets.length} of {targets.length})
        </CardTitle>

        {(targetsQuery.isFetching || assetsQuery.isFetching) && (
          <span className="text-sm text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset, host or URL"
            className="w-full max-w-sm"
          />

          <Select
            value={verificationStatus}
            onValueChange={(value) =>
              setVerificationStatus(
                (value ?? "ALL") as "ALL" | VerificationStatus,
              )
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All verification</SelectItem>
              <SelectItem value="NOT_VERIFIED">Not verified</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={monitoringStatus}
            onValueChange={(value) =>
              setMonitoringStatus(
                (value ?? "ALL") as "ALL" | "ENABLED" | "DISABLED",
              )
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Monitoring" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All monitoring</SelectItem>
              <SelectItem value="ENABLED">Enabled</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              search.length === 0 &&
              verificationStatus === "ALL" &&
              monitoringStatus === "ALL"
            }
            onClick={() => {
              setSearch("");
              setVerificationStatus("ALL");
              setMonitoringStatus("ALL");
            }}
          >
            Clear filters
          </Button>
        </div>

        {actionError && (
          <p className="mb-4 text-sm text-destructive">
            {actionError instanceof Error
              ? actionError.message
              : "Failed to update monitoring target"}
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Scrape URL</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Monitoring</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Last verified</TableHead>
              <TableHead>Last collected</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No monitoring targets found.
                </TableCell>
              </TableRow>
            ) : filteredTargets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No monitoring targets match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTargets.map((target) => {
                const isThisTargetPending =
                  (verifyMutation.isPending &&
                    verifyMutation.variables === target.targetId) ||
                  (enableMutation.isPending &&
                    enableMutation.variables === target.targetId) ||
                  (disableMutation.isPending &&
                    disableMutation.variables === target.targetId);

                return (
                  <TableRow key={target.targetId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assetNameById.get(target.assetId) ?? "Unknown asset"}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {target.host}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-72 truncate font-mono text-xs">
                      {getScrapeUrl(target)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getVerificationVariant(
                          target.verificationStatus,
                        )}
                      >
                        {target.verificationStatus}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          target.monitoringEnabled ? "default" : "outline"
                        }
                      >
                        {target.monitoringEnabled ? "ENABLED" : "DISABLED"}
                      </Badge>
                    </TableCell>

                    <TableCell>{target.scrapeIntervalSeconds}s</TableCell>

                    <TableCell>{formatDate(target.lastVerifiedAt)}</TableCell>

                    <TableCell>{formatDate(target.lastCollectedAt)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/assets/${target.assetId}/metrics`}
                          className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          View metrics
                        </Link>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isThisTargetPending}
                          onClick={() => verifyMutation.mutate(target.targetId)}
                        >
                          {verifyMutation.isPending &&
                          verifyMutation.variables === target.targetId
                            ? "Verifying..."
                            : "Verify"}
                        </Button>

                        {target.monitoringEnabled ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isThisTargetPending}
                            onClick={() =>
                              disableMutation.mutate(target.targetId)
                            }
                          >
                            {disableMutation.isPending &&
                            disableMutation.variables === target.targetId
                              ? "Disabling..."
                              : "Disable"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              isThisTargetPending ||
                              target.verificationStatus !== "VERIFIED"
                            }
                            onClick={() =>
                              enableMutation.mutate(target.targetId)
                            }
                          >
                            {enableMutation.isPending &&
                            enableMutation.variables === target.targetId
                              ? "Enabling..."
                              : "Enable"}
                          </Button>
                        )}
                      </div>

                      {target.lastError && (
                        <p className="mt-2 max-w-80 text-right text-xs text-destructive">
                          {target.lastError}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

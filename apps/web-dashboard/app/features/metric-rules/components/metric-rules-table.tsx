"use client";

import { useMemo, useState } from "react";

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

import { useAssets } from "@/app/features/assets/api/use-assets";

import { useMetricRules } from "../api/use-metric-rules";
import type {
  MetricRuleOperator,
  MetricRuleSeverity,
  MetricRuleType,
} from "../types/metric-rule";

function getSeverityVariant(
  severity: MetricRuleSeverity,
): "destructive" | "outline" {
  return severity === "CRITICAL" ? "destructive" : "outline";
}

function formatMetricType(metricType: MetricRuleType): string {
  switch (metricType) {
    case "CPU_USAGE":
      return "CPU Usage";

    case "MEMORY_USAGE":
      return "Memory Usage";

    case "DISK_USAGE":
      return "Disk Usage";
  }
}

function formatOperator(operator: MetricRuleOperator): string {
  switch (operator) {
    case "GREATER_THAN":
      return ">";

    case "GREATER_THAN_OR_EQUAL":
      return "≥";
  }
}

function formatDuration(seconds: number): string {
  if (seconds === 0) {
    return "Immediately";
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60;

    return `${minutes} min`;
  }

  return `${seconds} sec`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MetricRulesTable() {
  const [search, setSearch] = useState("");

  const [metricType, setMetricType] = useState<"ALL" | MetricRuleType>("ALL");

  const [severity, setSeverity] = useState<"ALL" | MetricRuleSeverity>("ALL");

  const [enabledStatus, setEnabledStatus] = useState<
    "ALL" | "ENABLED" | "DISABLED"
  >("ALL");

  const rulesQuery = useMetricRules();
  const assetsQuery = useAssets();

  const rules = rulesQuery.data ?? [];
  const assets = assetsQuery.data ?? [];

  const assetNameById = useMemo(
    () => new Map(assets.map((asset) => [asset.assetId, asset.name])),
    [assets],
  );

  const filteredRules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const assetName = assetNameById.get(rule.assetId) ?? "";

      const matchesSearch =
        normalizedSearch.length === 0 ||
        assetName.toLowerCase().includes(normalizedSearch) ||
        formatMetricType(rule.metricType)
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesMetricType =
        metricType === "ALL" || rule.metricType === metricType;

      const matchesSeverity = severity === "ALL" || rule.severity === severity;

      const matchesEnabled =
        enabledStatus === "ALL" ||
        (enabledStatus === "ENABLED" && rule.enabled) ||
        (enabledStatus === "DISABLED" && !rule.enabled);

      return (
        matchesSearch && matchesMetricType && matchesSeverity && matchesEnabled
      );
    });
  }, [rules, assetNameById, search, metricType, severity, enabledStatus]);

  if (rulesQuery.isLoading || assetsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading metric rules...
        </CardContent>
      </Card>
    );
  }

  if (rulesQuery.isError || assetsQuery.isError) {
    const error = rulesQuery.error ?? assetsQuery.error;

    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load metric rules
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Metric rules ({filteredRules.length} of {rules.length})
        </CardTitle>

        {(rulesQuery.isFetching || assetsQuery.isFetching) && (
          <span className="text-sm text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset or metric"
            className="w-full max-w-sm"
          />

          <Select
            value={metricType}
            onValueChange={(value) =>
              setMetricType((value ?? "ALL") as "ALL" | MetricRuleType)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Metric type" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All metric types</SelectItem>
              <SelectItem value="CPU_USAGE">CPU Usage</SelectItem>
              <SelectItem value="MEMORY_USAGE">Memory Usage</SelectItem>
              <SelectItem value="DISK_USAGE">Disk Usage</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severity}
            onValueChange={(value) =>
              setSeverity((value ?? "ALL") as "ALL" | MetricRuleSeverity)
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={enabledStatus}
            onValueChange={(value) =>
              setEnabledStatus(
                (value ?? "ALL") as "ALL" | "ENABLED" | "DISABLED",
              )
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
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
              metricType === "ALL" &&
              severity === "ALL" &&
              enabledStatus === "ALL"
            }
            onClick={() => {
              setSearch("");
              setMetricType("ALL");
              setSeverity("ALL");
              setEnabledStatus("ALL");
            }}
          >
            Clear filters
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated at</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No metric rules found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRules.map((rule) => (
                <TableRow key={rule.ruleId}>
                  <TableCell className="font-medium">
                    {assetNameById.get(rule.assetId) ?? "Unknown asset"}
                  </TableCell>

                  <TableCell>{formatMetricType(rule.metricType)}</TableCell>

                  <TableCell className="font-mono">
                    {formatOperator(rule.operator)} {rule.thresholdValue}%
                  </TableCell>

                  <TableCell>{formatDuration(rule.durationSeconds)}</TableCell>

                  <TableCell>
                    <Badge variant={getSeverityVariant(rule.severity)}>
                      {rule.severity}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={rule.enabled ? "default" : "outline"}>
                      {rule.enabled ? "ENABLED" : "DISABLED"}
                    </Badge>
                  </TableCell>

                  <TableCell>{formatDate(rule.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

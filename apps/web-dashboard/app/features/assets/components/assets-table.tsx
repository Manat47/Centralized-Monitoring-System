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
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Asset,
  AssetEnvironment,
  AssetStatus,
  AssetTargetType,
} from "../types/asset";

import { useAssets } from "../api/use-assets";
import { Button } from "@/components/ui/button";
import { AssetActions } from "./asset-actions";
import Link from "next/link";
import { Search } from "lucide-react";

function getTargetAddress(asset: Asset): string {
  if (asset.targetType === "SERVER") {
    return asset.ipAddress ?? "-";
  }

  return asset.endpoint ?? "-";
}

function getAssetSubtitle(asset: Asset): string {
  if (asset.hostname) {
    return asset.hostname;
  }

  if (asset.targetType === "SERVER") {
    return asset.ipAddress ?? "-";
  }

  return asset.endpoint ?? "-";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTargetType(value: AssetTargetType): string {
  switch (value) {
    case "SERVER":
      return "Server";
    case "APPLICATION":
      return "Application";
    case "SERVICE":
      return "Service";
  }
}

function formatEnvironment(value: AssetEnvironment): string {
  switch (value) {
    case "PRODUCTION":
      return "Production";
    case "STAGING":
      return "Staging";
    case "DEVELOPMENT":
      return "Development";
  }
}

function formatStatus(value: AssetStatus): string {
  switch (value) {
    case "ACTIVATE":
      return "Active";
    case "INACTIVATE":
      return "Inactive";
    case "DEACTIVATE":
      return "Deactivated";
  }
}

function getStatusClass(status: AssetStatus): string {
  switch (status) {
    case "ACTIVATE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "INACTIVATE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DEACTIVATE":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getTypeClass(type: AssetTargetType): string {
  switch (type) {
    case "SERVER":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "APPLICATION":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "SERVICE":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function AssetsTable() {
  const { data, isLoading, isError, error, isFetching } = useAssets();
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | AssetTargetType>("ALL");
  const [status, setStatus] = useState<"ALL" | AssetStatus>("ALL");
  const [environment, setEnvironment] = useState<"ALL" | AssetEnvironment>(
    "ALL",
  );

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (data ?? []).filter((asset) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        asset.name.toLowerCase().includes(normalizedSearch) ||
        asset.hostname?.toLowerCase().includes(normalizedSearch) ||
        asset.ipAddress?.toLowerCase().includes(normalizedSearch) ||
        asset.endpoint?.toLowerCase().includes(normalizedSearch);

      const matchesTargetType =
        targetType === "ALL" || asset.targetType === targetType;

      const matchesEnvironment =
        environment === "ALL" || asset.environment === environment;

      const matchesStatus = status === "ALL" || asset.status === status;

      return (
        matchesSearch &&
        matchesTargetType &&
        matchesEnvironment &&
        matchesStatus
      );
    });
  }, [data, search, targetType, environment, status]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading assets...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">Failed to load assets</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Assets
            </CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              {filteredAssets.length} of {data?.length ?? 0} assets
            </p>
          </div>

          {isFetching && (
            <span className="text-xs text-slate-400">Updating...</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative min-w-64 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets..."
              className="pl-9"
            />
          </div>

          <Select
            value={targetType}
            onValueChange={(value) =>
              setTargetType(value as "ALL" | AssetTargetType)
            }
          >
            <SelectTrigger className="w-40">
              <span className="truncate">
                {targetType === "ALL"
                  ? "All types"
                  : formatTargetType(targetType)}
              </span>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="SERVER">Server</SelectItem>
              <SelectItem value="APPLICATION">Application</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={environment}
            onValueChange={(value) =>
              setEnvironment(value as "ALL" | AssetEnvironment)
            }
          >
            <SelectTrigger className="w-40">
              <span className="truncate">
                {environment === "ALL"
                  ? "All environments"
                  : formatEnvironment(environment)}
              </span>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All environments</SelectItem>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="STAGING">Staging</SelectItem>
              <SelectItem value="DEVELOPMENT">Development</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "ALL" | AssetStatus)}
          >
            <SelectTrigger className="w-36">
              <span className="truncate">
                {status === "ALL" ? "All statuses" : formatStatus(status)}
              </span>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVATE">Active</SelectItem>
              <SelectItem value="INACTIVATE">Inactive</SelectItem>
              <SelectItem value="DEACTIVATE">Deactivated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={
              search.length === 0 &&
              targetType === "ALL" &&
              environment === "ALL" &&
              status === "ALL"
            }
            className="text-slate-500"
            onClick={() => {
              setSearch("");
              setTargetType("ALL");
              setEnvironment("ALL");
              setStatus("ALL");
            }}
          >
            Clear
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
              <TableHead className="pl-5 text-xs font-medium text-slate-500">
                Asset Name
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                Type
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                Environment
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                IP / Endpoint
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                Status
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                Monitoring
              </TableHead>

              <TableHead className="text-xs font-medium text-slate-500">
                Updated
              </TableHead>

              <TableHead className="pr-5 text-right text-xs font-medium text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No assets found
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Try changing or clearing the current filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.assetId} className="hover:bg-slate-50/60">
                  <TableCell className="pl-5 py-4">
                    <div className="min-w-0">
                      <Link
                        href={`/assets/${asset.assetId}`}
                        className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {asset.name}
                      </Link>

                      {asset.hostname && (
                        <p className="mt-0.5 max-w-52 truncate text-xs text-slate-500">
                          {asset.hostname}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getTypeClass(asset.targetType)}
                    >
                      {formatTargetType(asset.targetType)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {formatEnvironment(asset.environment)}
                  </TableCell>

                  <TableCell>
                    <span
                      title={getTargetAddress(asset)}
                      className="block max-w-64 truncate font-mono text-xs text-slate-700"
                    >
                      {getTargetAddress(asset)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusClass(asset.status)}
                    >
                      {formatStatus(asset.status)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          asset.monitoringEnable
                            ? "size-2 rounded-full bg-blue-500"
                            : "size-2 rounded-full bg-slate-300"
                        }
                      />

                      <span className="text-xs text-slate-600">
                        {asset.monitoringEnable ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    {formatDate(asset.updatedAt)}
                  </TableCell>

                  <TableCell className="pr-5 text-right">
                    <AssetActions asset={asset} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

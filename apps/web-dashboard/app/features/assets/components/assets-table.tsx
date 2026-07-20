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
import { EditAssetDialog } from "./edit-asset-dialog";
import { AssetActions } from "./asset-actions";

function getStatusVariant(
  status: AssetStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVATE":
      return "default";

    case "INACTIVATE":
      return "secondary";

    case "DEACTIVATE":
      return "outline";
  }
}

function getTargetVariant(
  targetType: AssetTargetType,
): "default" | "secondary" | "outline" {
  switch (targetType) {
    case "SERVER":
      return "default";

    case "APPLICATION":
      return "secondary";

    case "SERVICE":
      return "outline";
  }
}

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
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Asset list ({filteredAssets.length} of {data?.length ?? 0})
        </CardTitle>

        {isFetching && (
          <span className="text-sm text-muted-foreground">Updating...</span>
        )}
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, hostname, IP or endpoint"
            className="w-full max-w-sm"
          />

          <Select
            value={targetType}
            onValueChange={(value) =>
              setTargetType(value as "ALL" | AssetTargetType)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Target type" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All target types</SelectItem>
              <SelectItem value="SERVER">Server</SelectItem>
              <SelectItem value="APPLICATION">Application</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "ALL" | AssetStatus)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVATE">Activate</SelectItem>
              <SelectItem value="INACTIVATE">Inactivate</SelectItem>
              <SelectItem value="DEACTIVATE">Deactivate</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={environment}
            onValueChange={(value) =>
              setEnvironment(value as "ALL" | AssetEnvironment)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ALL">All environments</SelectItem>
              <SelectItem value="PRODUCTION">Production</SelectItem>
              <SelectItem value="STAGING">Staging</SelectItem>
              <SelectItem value="DEVELOPMENT">Development</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              search.length === 0 &&
              targetType === "ALL" &&
              environment === "ALL" &&
              status === "ALL"
            }
            onClick={() => {
              setSearch("");
              setTargetType("ALL");
              setEnvironment("ALL");
              setStatus("ALL");
            }}
          >
            Clear filters
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Monitoring</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.assetId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{asset.name}</p>

                      <p className="text-xs text-muted-foreground">
                        {getAssetSubtitle(asset)}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={getTargetVariant(asset.targetType)}>
                      {asset.targetType}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-72 truncate font-mono text-xs">
                    {getTargetAddress(asset)}
                  </TableCell>

                  <TableCell>{asset.environment}</TableCell>

                  <TableCell>
                    <Badge variant={getStatusVariant(asset.status)}>
                      {asset.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={asset.monitoringEnable ? "default" : "outline"}
                    >
                      {asset.monitoringEnable ? "ENABLED" : "DISABLED"}
                    </Badge>
                  </TableCell>

                  <TableCell>{formatDate(asset.updatedAt)}</TableCell>
                  <TableCell className="text-right">
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

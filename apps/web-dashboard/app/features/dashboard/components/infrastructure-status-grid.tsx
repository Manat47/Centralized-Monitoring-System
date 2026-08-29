"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useDashboardSummary } from "../api/use-dashboard-summary";
import type { AssetOverallStatus } from "../types/dashboard-summary";
import { InfrastructureStatusCard } from "./infrastructure-status-card";

type StatusFilter = "ALL" | AssetOverallStatus;

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
  { value: "NO_DATA", label: "No data" },
  { value: "OK", label: "OK" },
];

const statusOrder: Record<AssetOverallStatus, number> = {
  CRITICAL: 0,
  WARNING: 1,
  NO_DATA: 2,
  NOT_MONITORED: 3,
  OK: 4,
  INACTIVE: 5,
};

function InfrastructureStatusSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="min-h-52 animate-pulse border border-slate-200 bg-white p-4"
        >
          <div className="flex justify-between gap-4">
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="h-5 w-16 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-8 rounded bg-slate-50" />
          <div className="mt-4 h-20 rounded bg-slate-50" />
          <div className="mt-4 h-8 rounded bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

export function InfrastructureStatusGrid() {
  const { data, isLoading, isError, error } = useDashboardSummary();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const assets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...(data?.assetOverview ?? [])]
      .filter((asset) => {
        const matchesFilter =
          filter === "ALL" ||
          asset.overallStatus === filter ||
          (filter === "NO_DATA" && asset.overallStatus === "NOT_MONITORED");
        const matchesSearch =
          normalizedSearch.length === 0 ||
          asset.name.toLowerCase().includes(normalizedSearch) ||
          asset.address?.toLowerCase().includes(normalizedSearch);

        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => {
        const statusDifference =
          statusOrder[left.overallStatus] - statusOrder[right.overallStatus];

        return statusDifference !== 0
          ? statusDifference
          : left.name.localeCompare(right.name);
      });
  }, [data?.assetOverview, filter, search]);

  return (
    <section
      aria-labelledby="infrastructure-status-heading"
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            id="infrastructure-status-heading"
            className="text-sm font-semibold text-slate-950"
          >
            Infrastructure Status
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Current operational signals across registered assets
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            aria-label="Filter assets by status"
            className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-1"
          >
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "h-7 rounded px-2.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  filter === item.value && "bg-slate-100 text-slate-950",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assets"
              aria-label="Search assets"
              className="h-9 bg-white pl-9 text-xs"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <InfrastructureStatusSkeleton />
      ) : isError ? (
        <div className="border border-rose-200 bg-white px-5 py-8 text-center">
          <p className="text-sm font-medium text-rose-700">
            Failed to load infrastructure status
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      ) : assets.length === 0 ? (
        <div className="border border-slate-200 bg-white px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">No assets found</p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust the status filter or search term.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {assets.map((asset) => (
            <InfrastructureStatusCard key={asset.assetId} asset={asset} />
          ))}
        </div>
      )}
    </section>
  );
}

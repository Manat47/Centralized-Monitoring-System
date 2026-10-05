"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useDashboardSummary } from "../api/use-dashboard-summary";
import type { AssetOverallStatus } from "../types/dashboard-summary";
import { InfrastructureStatusCard } from "./infrastructure-status-card";

type StatusFilter = "ISSUES" | "ALL" | AssetOverallStatus;

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: "ISSUES", label: "Issues" },
  { value: "ALL", label: "All" },
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
  { value: "NO_DATA", label: "No data" },
  { value: "NOT_MONITORED", label: "Not monitored" },
  { value: "OK", label: "OK" },
  { value: "INACTIVE", label: "Inactive" },
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
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-3"
        />
      ))}
    </div>
  );
}

export function InfrastructureStatusGrid() {
  const { data, isLoading, isError, error } = useDashboardSummary();
  const [filter, setFilter] = useState<StatusFilter>("ISSUES");
  const [search, setSearch] = useState("");

  const assets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...(data?.assetOverview ?? [])]
      .filter((asset) => {
        const matchesFilter =
          filter === "ALL" ||
          (filter === "ISSUES" && ["CRITICAL", "WARNING", "NO_DATA"].includes(asset.overallStatus)) ||
          asset.overallStatus === filter;
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
  const visibleAssets = filter === "ISSUES" ? assets.slice(0, 8) : assets;

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
            {filter === "ISSUES" ? "Top Issues" : "Infrastructure Status"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "ISSUES" ? "Assets requiring attention, ordered by severity" : "Current operational signals across registered assets"}
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
              onChange={(event) => {
                setSearch(event.target.value);
                if (filter === "ISSUES") setFilter("ALL");
              }}
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
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-900">{filter === "ISSUES" ? "No current issues" : "No assets found"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "ISSUES" ? "All monitored assets are outside the issue states." : "Adjust the status filter or search term."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleAssets.map((asset) => (
            <InfrastructureStatusCard key={asset.assetId} asset={asset} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{!isLoading && !isError ? `Showing ${visibleAssets.length} of ${assets.length} matching assets` : ""}</span>
        <Link href="/infrastructure" className="font-medium text-blue-700 hover:underline">View all infrastructure</Link>
      </div>
    </section>
  );
}

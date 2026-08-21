"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useDashboardSummary } from "../api/use-dashboard-summary";

function formatUpdatedAt(timestamp: number): string {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function DashboardHeader() {
  const queryClient = useQueryClient();
  const fetchingCount = useIsFetching();

  const { dataUpdatedAt } = useDashboardSummary();

  const isFetching = fetchingCount > 0;

  async function handleRefresh(): Promise<void> {
    await queryClient.refetchQueries({
      type: "active",
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of monitored infrastructure and active operational issues
        </p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">
          Updated {formatUpdatedAt(dataUpdatedAt)}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={handleRefresh}
          className="gap-2 bg-white"
        >
          <RefreshCw
            className={isFetching ? "size-3.5 animate-spin" : "size-3.5"}
          />
          Refresh
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useDashboardSummary } from "../api/use-dashboard-summary";

import DecryptedText from "@/components/DecryptedText";

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

  const { dataUpdatedAt, data } = useDashboardSummary();

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
          <DecryptedText
            text="Dashboard"
            animateOn="view"
            sequential
            revealDirection="start"
            speed={35}
            maxIterations={8}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            encryptedClassName="text-slate-400"
          />
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of monitored infrastructure and active operational issues
        </p>
        {data?.dataQuality?.stale && <p role="status" className="mt-2 text-xs font-medium text-amber-700">Showing the last available snapshot from {new Date(data.dataQuality.updatedAt).toLocaleString()}; a monitoring service is currently unavailable.</p>}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">
          Updated {formatUpdatedAt(data?.dataQuality?.updatedAt ? Date.parse(data.dataQuality.updatedAt) : dataUpdatedAt)}
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

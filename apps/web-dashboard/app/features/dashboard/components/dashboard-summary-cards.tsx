"use client";

import Link from "next/link";

import {
  AlertTriangle,
  BellRing,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Globe,
  Server,
} from "lucide-react";

import CountUp from "@/components/CountUp";
import { Card, CardContent } from "@/components/ui/card";

import { useDashboardSummary } from "../api/use-dashboard-summary";

function SummaryCardSkeleton() {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardContent className="p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-5 h-8 w-16 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

export function DashboardSummaryCards() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-rose-200 shadow-none">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-rose-700">
            Failed to load dashboard summary
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const servers = data.assetOverview.filter((asset) => asset.targetType === "SERVER" && asset.telemetry?.status !== "NOT_CONFIGURED");
  const applicationAssets = data.assetOverview.filter((asset) => asset.targetType !== "SERVER" && (asset.healthChecks?.total ?? 0) > 0);
  const cards = [
    {
      title: "Monitored Servers (Hosts)",
      href: "/infrastructure",
      value: servers.length,
      icon: Server,
      iconClassName: "bg-blue-50 text-blue-700",
      valueClassName: "text-slate-950",
    },
    {
      title: "Monitored Applications (Synthetic)",
      href: "/health-checks",
      value: applicationAssets.reduce((sum, asset) => sum + (asset.healthChecks?.total ?? 0), 0) + data.standaloneChecks.length,
      icon: Globe,
      iconClassName: "bg-indigo-50 text-indigo-700",
      valueClassName: "text-slate-950",
    },
    {
      title: "Active Firing Alerts",
      href: "/alerts",
      value: data.alerts.firing,
      icon: BellRing,
      iconClassName: "bg-rose-50 text-rose-700",
      valueClassName: "text-rose-700",
    },
    {
      title: "OK Assets",
      href: "/infrastructure?overall=OK",
      value: data.assets.ok,
      icon: CircleCheck,
      iconClassName: "bg-emerald-50 text-emerald-700",
      valueClassName: "text-emerald-700",
    },
    {
      title: "Warning Assets",
      href: "/infrastructure?overall=WARNING",
      value: data.assets.warning,
      icon: AlertTriangle,
      iconClassName: "bg-amber-50 text-amber-700",
      valueClassName: "text-amber-700",
    },
    {
      title: "Critical Assets",
      href: "/infrastructure?overall=CRITICAL",
      value: data.assets.critical,
      icon: CircleAlert,
      iconClassName: "bg-rose-50 text-rose-700",
      valueClassName: "text-rose-700",
    },
    {
      title: "No Data Assets",
      href: "/infrastructure?overall=NO_DATA",
      value: data.assets.noData,
      icon: CircleDashed,
      iconClassName: "bg-slate-100 text-slate-600",
      valueClassName: "text-slate-700",
    },
    {
      title: "Not Monitored",
      href: "/infrastructure?overall=NOT_MONITORED",
      value: data.assets.notMonitored,
      icon: CircleDashed,
      iconClassName: "bg-slate-100 text-slate-600",
      valueClassName: "text-slate-700",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <Link key={card.title} href={card.href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`View ${card.title} assets`}>
          <Card className="border-slate-200 bg-white shadow-none transition-colors hover:border-blue-300">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">
                  {card.title}
                </p>
                <div
                  className={`flex size-8 items-center justify-center rounded-md ${card.iconClassName}`}
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-semibold tabular-nums ${card.valueClassName}`}
              >
                <CountUp
                  from={0}
                  to={card.value}
                  separator=","
                  direction="up"
                  duration={0.65}
                  delay={index * 0.05}
                />
              </p>
            </CardContent>
          </Card>
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
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
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

export function DashboardSummaryCards() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
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

  const noSignal = data.assets.noData + data.assets.notMonitored;
  const cards = [
    {
      title: "Total Assets",
      value: data.assets.total,
      description: `${data.assets.inactive} inactive`,
      icon: Server,
      iconClassName: "bg-blue-50 text-blue-700",
      valueClassName: "text-slate-950",
    },
    {
      title: "OK",
      value: data.assets.ok,
      description: "Signals operating normally",
      icon: CircleCheck,
      iconClassName: "bg-emerald-50 text-emerald-700",
      valueClassName: "text-emerald-700",
    },
    {
      title: "Warning",
      value: data.assets.warning,
      description: "Investigation recommended",
      icon: AlertTriangle,
      iconClassName: "bg-amber-50 text-amber-700",
      valueClassName: "text-amber-700",
    },
    {
      title: "Critical",
      value: data.assets.critical,
      description: "Immediate attention required",
      icon: CircleAlert,
      iconClassName: "bg-rose-50 text-rose-700",
      valueClassName: "text-rose-700",
    },
    {
      title: "No Data",
      value: noSignal,
      description: `${data.assets.notMonitored} not monitored`,
      icon: CircleDashed,
      iconClassName: "bg-slate-100 text-slate-600",
      valueClassName: "text-slate-700",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="border-slate-200 bg-white shadow-none"
          >
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
              <p className="mt-1 truncate text-xs text-slate-500">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

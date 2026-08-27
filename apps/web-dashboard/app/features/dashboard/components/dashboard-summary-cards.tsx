"use client";

import { Bell, CircleAlert, Crosshair, HeartPulse, Server } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import CountUp from "@/components/CountUp";

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

  const endpointHealthPercent =
    data.healthChecks.checked > 0
      ? Math.round(
          (data.healthChecks.available / data.healthChecks.checked) * 100,
        )
      : null;

  const cards = [
    {
      title: "Active Assets",
      value: data.assets.active,
      suffix: "",
      description: `${data.assets.active} / ${data.assets.total} active`,
      icon: Server,
      iconClassName: "bg-blue-50 text-blue-700",
      valueClassName: "text-slate-950",
    },
    {
      title: "Monitored Targets",
      value: data.monitoringTargets.enabled,
      suffix: "",
      description: `${data.monitoringTargets.enabled} / ${data.monitoringTargets.total} enabled`,
      icon: Crosshair,
      iconClassName: "bg-sky-50 text-sky-700",
      valueClassName: "text-slate-950",
    },
    {
      title: "Active Alerts",
      value: data.alerts.active,
      suffix: "",
      description:
        data.alerts.active === 0 ? "No active incidents" : "Requires attention",
      icon: Bell,
      iconClassName:
        data.alerts.active > 0
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600",
      valueClassName:
        data.alerts.active > 0 ? "text-amber-700" : "text-slate-950",
    },
    {
      title: "Critical Alerts",
      value: data.alerts.critical,
      suffix: "",
      description:
        data.alerts.critical === 0
          ? "No critical incidents"
          : "Immediate attention",
      icon: CircleAlert,
      iconClassName:
        data.alerts.critical > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600",
      valueClassName:
        data.alerts.critical > 0 ? "text-rose-700" : "text-slate-950",
    },
    {
      title: "Endpoint Health",
      value: endpointHealthPercent,
      suffix: "%",
      description:
        data.healthChecks.checked > 0
          ? `${data.healthChecks.available} / ${data.healthChecks.checked} available`
          : data.healthChecks.total > 0
            ? "Waiting for first check"
            : "No endpoints configured",
      icon: HeartPulse,
      iconClassName:
        endpointHealthPercent === null
          ? "bg-slate-100 text-slate-600"
          : endpointHealthPercent === 100
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700",
      valueClassName: "text-slate-950",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                  className={`flex size-8 items-center justify-center rounded-lg ${card.iconClassName}`}
                >
                  <Icon className="size-4" />
                </div>
              </div>

              <p
                className={`mt-3 text-2xl font-semibold tabular-nums tracking-tight ${card.valueClassName}`}
              >
                {card.value === null ? (
                  "—"
                ) : (
                  <>
                    <CountUp
                      from={0}
                      to={card.value}
                      separator=","
                      direction="up"
                      duration={0.65}
                      delay={index * 0.05}
                    />
                    {card.suffix}
                  </>
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

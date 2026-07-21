"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useDashboardSummary } from "../api/use-dashboard-summary";

export function DashboardSummaryCards() {
  const { data, isLoading, isError, error, isFetching } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load dashboard summary
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      title: "Assets",
      value: data?.assets.total ?? 0,
      description: `${data?.assets.active ?? 0} active`,
    },
    {
      title: "Monitoring Targets",
      value: data?.monitoringTargets.total ?? 0,
      description: `${data?.monitoringTargets.enabled ?? 0} enabled`,
    },
    {
      title: "Metric Rules",
      value: data?.metricRules.total ?? 0,
      description: `${data?.metricRules.enabled ?? 0} enabled`,
    },
    {
      title: "Active Alerts",
      value: data?.alerts.active ?? 0,
      description: `${data?.alerts.critical ?? 0} critical · ${data?.alerts.total ?? 0} total`,
    },
  ];

  return (
    <div className="space-y-3">
      {isFetching && (
        <p className="text-right text-xs text-muted-foreground">Updating...</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">{card.value}</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

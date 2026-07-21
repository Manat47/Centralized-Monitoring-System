"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useSystemStatus } from "../api/use-system-status";

export function SystemStatusCard() {
  const { data, isLoading, isError, error, isFetching } = useSystemStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading system status...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-destructive">
            Failed to load system status
          </p>

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
        <div>
          <CardTitle className="text-base">System Status</CardTitle>

          <p className="mt-1 text-xs text-muted-foreground">
            Last checked:{" "}
            {data
              ? new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "medium",
                }).format(new Date(data.checkedAt))
              : "-"}
          </p>
        </div>

        <Badge variant={data?.status === "HEALTHY" ? "default" : "destructive"}>
          {data?.status ?? "UNKNOWN"}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.services ?? []).map((service) => (
            <div key={service.name} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{service.name}</p>

                <Badge
                  variant={service.status === "UP" ? "default" : "destructive"}
                >
                  {service.status}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Response time:{" "}
                {service.responseTimeMs !== null
                  ? `${service.responseTimeMs} ms`
                  : "-"}
              </p>

              {service.error && (
                <p className="mt-2 text-sm text-destructive">{service.error}</p>
              )}
            </div>
          ))}
        </div>

        {isFetching && (
          <p className="mt-3 text-right text-xs text-muted-foreground">
            Updating...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

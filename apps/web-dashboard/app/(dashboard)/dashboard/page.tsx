import { DashboardSummaryCards } from "@/app/features/dashboard/components/dashboard-summary-cards";
import { RecentAlerts } from "@/app/features/dashboard/components/recent-alerts";
import { SystemStatusCard } from "@/app/features/system-status/components/system-status-card";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Overview of assets, monitoring, rules and alerts.
        </p>
      </div>

      <DashboardSummaryCards />

      <SystemStatusCard />

      <RecentAlerts />
    </section>
  );
}

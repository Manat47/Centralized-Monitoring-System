import { DashboardSummaryCards } from "@/app/features/dashboard/components/dashboard-summary-cards";

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
    </section>
  );
}

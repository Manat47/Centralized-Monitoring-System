import { DashboardHeader } from "@/app/features/dashboard/components/dashboard-header";
import { DashboardSummaryCards } from "@/app/features/dashboard/components/dashboard-summary-cards";
import { NeedsAttention } from "@/app/features/dashboard/components/needs-attention";
import { SystemStatusCard } from "@/app/features/system-status/components/system-status-card";

export default function DashboardPage() {
  return (
    <section className="space-y-5">
      <DashboardHeader />

      <DashboardSummaryCards />

      <NeedsAttention />

      <SystemStatusCard />
    </section>
  );
}

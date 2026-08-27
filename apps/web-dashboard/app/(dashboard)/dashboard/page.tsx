import { DashboardHeader } from "@/app/features/dashboard/components/dashboard-header";
import { DashboardSummaryCards } from "@/app/features/dashboard/components/dashboard-summary-cards";
import { NeedsAttention } from "@/app/features/dashboard/components/needs-attention";
import { HealthOverview } from "@/app/features/dashboard/components/health-overview";
import { MonitoringSnapshot } from "@/app/features/dashboard/components/monitoring-snapshot";
import FadeContent from "@/app/features/react-bits/fade-content";

export default function DashboardPage() {
  return (
    <FadeContent duration={550} initialOpacity={0} threshold={0.01}>
      <section className="space-y-5">
        <DashboardHeader />

        <DashboardSummaryCards />

        <NeedsAttention />

        <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.4fr]">
          <HealthOverview />
          <MonitoringSnapshot />
        </div>
      </section>
    </FadeContent>
  );
}

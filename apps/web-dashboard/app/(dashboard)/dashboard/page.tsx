import { DashboardHeader } from "@/app/features/dashboard/components/dashboard-header";
import { DashboardSummaryCards } from "@/app/features/dashboard/components/dashboard-summary-cards";
import { InfrastructureStatusGrid } from "@/app/features/dashboard/components/infrastructure-status-grid";
import { NeedsAttention } from "@/app/features/dashboard/components/needs-attention";
import FadeContent from "@/app/features/react-bits/fade-content";

export default function DashboardPage() {
  return (
    <FadeContent duration={550} initialOpacity={0} threshold={0.01}>
      <section className="space-y-5">
        <DashboardHeader />

        <DashboardSummaryCards />

        <InfrastructureStatusGrid />

        <NeedsAttention />
      </section>
    </FadeContent>
  );
}

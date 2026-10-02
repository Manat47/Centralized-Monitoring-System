import Link from "next/link";

import { AssetsTable } from "@/app/features/assets/components/assets-table";
import { CreateAssetDialog } from "@/app/features/assets/components/create-asset-dialog";
import { MonitoringTargetsTable } from "@/app/features/monitoring-targets/components/monitoring-targets-table";
import { CreateMonitoringTargetDialog } from "@/app/features/monitoring-targets/components/create-monitoring-target-dialog";
import { InfrastructureMetricsOverview } from "@/app/features/monitoring-targets/components/infrastructure-metrics-overview";

interface InfrastructurePageProps {
  searchParams: Promise<{ view?: string; overall?: string; status?: string }>;
}

export default async function InfrastructurePage({ searchParams }: InfrastructurePageProps) {
  const { view, overall, status } = await searchParams;
  const metrics = view === "metrics";

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">Infrastructure</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage assets and their metric collection in one place.
          </p>
        </div>
        {metrics ? <CreateMonitoringTargetDialog /> : <CreateAssetDialog />}
      </div>
      <nav aria-label="Infrastructure views" className="flex gap-2 border-b border-slate-200">
        <Link href="/infrastructure?view=inventory" aria-current={!metrics ? "page" : undefined} className={`border-b-2 px-3 py-2 text-sm ${metrics ? "border-transparent text-slate-500" : "border-blue-600 font-medium text-blue-700"}`}>Inventory</Link>
        <Link href="/infrastructure?view=metrics" aria-current={metrics ? "page" : undefined} className={`border-b-2 px-3 py-2 text-sm ${metrics ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-slate-500"}`}>Metrics Summary</Link>
      </nav>
      {metrics ? (
        <div className="space-y-6">
          <InfrastructureMetricsOverview />
          <MonitoringTargetsTable />
        </div>
      ) : <AssetsTable key={`${overall ?? "all"}-${status ?? "current"}`} overallFilter={overall} initialStatus={status === "ALL" ? "ALL" : undefined} />}
    </section>
  );
}

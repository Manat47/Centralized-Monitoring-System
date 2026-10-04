import { Suspense } from "react";

import { MonitoringTargetsTable } from "@/app/features/monitoring-targets/components/monitoring-targets-table";

export default function MonitoringTargetsPage() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Infrastructure</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Monitoring Targets</h1>
        <p className="mt-1 text-sm text-slate-500">Inspect verification and collection status for configured targets.</p>
      </div>
      <Suspense fallback={<p className="py-12 text-center text-sm text-slate-500">Loading targets...</p>}>
        <MonitoringTargetsTable />
      </Suspense>
    </section>
  );
}

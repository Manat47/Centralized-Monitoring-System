import { MonitoringTargetsTable } from "@/app/features/monitoring-targets/components/monitoring-targets-table";
import { CreateMonitoringTargetDialog } from "@/app/features/monitoring-targets/components/create-monitoring-target-dialog";

export default function MonitoringTargetsPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">Monitoring Targets</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Connections between server assets and Node Exporter collection.
          </p>
        </div>

        <CreateMonitoringTargetDialog />
      </div>

      <MonitoringTargetsTable />
    </section>
  );
}

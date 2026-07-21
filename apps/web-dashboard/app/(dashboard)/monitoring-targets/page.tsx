import { MonitoringTargetsTable } from "@/app/features/monitoring-targets/components/monitoring-targets-table";
import { CreateMonitoringTargetDialog } from "@/app/features/monitoring-targets/components/create-monitoring-target-dialog";

export default function MonitoringTargetsPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Monitoring Targets</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure and control metric collection targets.
          </p>
        </div>

        <CreateMonitoringTargetDialog />
      </div>

      <MonitoringTargetsTable />
    </section>
  );
}

import { CreateHealthCheckDialog } from "@/app/features/health-checks/components/create-health-check-dialog";
import { HealthChecksTable } from "@/app/features/health-checks/components/health-checks-table";

export default function HealthChecksPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Health Checks</h1>
          <p className="mt-1 text-sm text-muted-foreground">HTTP endpoint availability monitoring for application assets.</p>
        </div>
        <CreateHealthCheckDialog />
      </div>
      <HealthChecksTable />
    </section>
  );
}

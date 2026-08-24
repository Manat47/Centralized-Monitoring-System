import { AuditLogsTable } from "@/app/features/audit-logs/components/audit-logs-table";

export default function AuditLogsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review user and system actions recorded across monitored resources.
        </p>
      </div>

      <AuditLogsTable />
    </section>
  );
}

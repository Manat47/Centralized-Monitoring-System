import { AlertsTable } from "@/app/features/alerts/components/alerts-table";

export default function AlertsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor and manage infrastructure alerts.
        </p>
      </div>

      <AlertsTable />
    </section>
  );
}

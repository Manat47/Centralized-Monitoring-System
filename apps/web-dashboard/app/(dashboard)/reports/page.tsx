import { ReportsTable } from "@/app/features/reports/components/reports-table";

export default function ReportsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and download operational monitoring reports.
        </p>
      </div>

      <ReportsTable />
    </section>
  );
}

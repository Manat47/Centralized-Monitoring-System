import { MetricRulesTable } from "@/app/features/metric-rules/components/metric-rules-table";
import { CreateMetricRuleDialog } from "@/app/features/metric-rules/components/create-metric-rule-dialog";

export default function MetricRulesPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Metric Rules</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Define thresholds used to detect infrastructure alerts.
          </p>
        </div>

        <CreateMetricRuleDialog />
      </div>

      <MetricRulesTable />
    </section>
  );
}

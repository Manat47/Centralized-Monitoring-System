import type { MetricChartStats } from "./metric-chart-utils";

interface MetricChartStatsProps {
  stats: MetricChartStats | null;
  formatter: (value: number) => string;
  label?: string;
  accentClassName?: string;
}

export function MetricChartStatsRow({
  stats,
  formatter,
  label,
  accentClassName = "bg-blue-600",
}: MetricChartStatsProps) {
  if (!stats) {
    return null;
  }

  const values = [
    { label: "Latest", value: stats.latest },
    { label: "Avg", value: stats.average },
    { label: "P95", value: stats.p95 },
    { label: "Max", value: stats.maximum },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      {label && (
        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
          <span className={`size-2 rounded-sm ${accentClassName}`} />
          {label}
        </span>
      )}

      {values.map((item) => (
        <span key={item.label}>
          {item.label}{" "}
          <strong className="font-semibold text-slate-900">
            {formatter(item.value)}
          </strong>
        </span>
      ))}
    </div>
  );
}

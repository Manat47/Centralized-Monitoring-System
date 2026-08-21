import type { ReactNode } from "react";

interface SnapshotMetricCardProps {
  title: string;
  value: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function SnapshotMetricCard({
  title,
  value,
  description,
  footer,
  children,
}: SnapshotMetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>

          {description && (
            <p className="mt-1 text-[11px] text-slate-400">{description}</p>
          )}
        </div>

        <p className="text-xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      </div>

      <div>{children}</div>

      {footer && (
        <div className="mt-3 border-t border-slate-200/70 pt-3">{footer}</div>
      )}
    </div>
  );
}

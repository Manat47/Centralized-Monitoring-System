import type { AuditReportSummary } from '../../../audit/application/use-cases/query-audit-report-summary.use-case';

import type { AlertReportSummary } from '../ports/alert-report-reader.port';

import type { AssetReportSnapshot } from '../ports/asset-report-reader.port';

import type {
  HealthCheckTargetSnapshot,
  HealthReportSummary,
  MetricsReportSummary,
} from '../ports/monitoring-report-reader.port';

export interface HealthTargetReportSummary {
  target: HealthCheckTargetSnapshot;
  summary: HealthReportSummary;
}

export interface AssetOperationalSummary {
  asset: AssetReportSnapshot;
  metrics: MetricsReportSummary;
  health: HealthTargetReportSummary[];
}

export interface ReportSummary {
  scope: {
    type: 'ALL_ASSETS' | 'ASSET';
    assetId: string | null;
  };

  period: {
    start: string;
    end: string;
  };

  assets: AssetOperationalSummary[];

  alerts: AlertReportSummary;

  audit: {
    scope: 'SYSTEM_WIDE';
    summary: AuditReportSummary;
  };
}

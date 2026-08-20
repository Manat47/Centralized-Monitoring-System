export interface AlertReportSummary {
  totalAlerts: number;

  severity: {
    warning: number;
    critical: number;
  };

  status: {
    triggered: number;
    acknowledged: number;
    resolved: number;
    closed: number;
  };

  activeAlerts: number;

  metricTypes: Record<string, number>;

  acknowledgementTime: {
    averageSeconds: number | null;
    p95Seconds: number | null;
  };

  resolutionTime: {
    averageSeconds: number | null;
    maxSeconds: number | null;
    p95Seconds: number | null;
  };
}

export const ALERT_REPORT_READER = Symbol('ALERT_REPORT_READER');

export interface AlertReportReader {
  querySummary(input: {
    assetId?: string;
    from: Date;
    to: Date;
  }): Promise<AlertReportSummary>;
}

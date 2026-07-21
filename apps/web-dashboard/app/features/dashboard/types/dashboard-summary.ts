export interface DashboardSummary {
  assets: {
    total: number;
    active: number;
  };

  monitoringTargets: {
    total: number;
    enabled: number;
  };

  metricRules: {
    total: number;
    enabled: number;
  };

  alerts: {
    total: number;
    active: number;
    critical: number;
  };
}

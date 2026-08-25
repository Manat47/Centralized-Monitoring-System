import type { ReportSummary } from '../../../domain/models/report-summary.model';
import { buildReportTemplateData } from './report-template-data';

describe('buildReportTemplateData', () => {
  it('formats backend values for the report template', () => {
    const summary: ReportSummary = {
      scope: { type: 'ASSET', assetId: 'asset-1', assetName: 'Checkout API' },
      period: {
        start: '2026-08-01T00:00:00.000Z',
        end: '2026-08-02T00:00:00.000Z',
      },
      assets: [
        {
          asset: {
            assetId: 'asset-1',
            name: 'Checkout API',
            hostname: null,
            targetType: 'SERVICE',
            ipAddress: null,
            endpoint: 'https://checkout.example.com',
            environment: 'PRODUCTION',
            status: 'ACTIVATE',
            monitoringEnable: false,
          },
          metrics: {
            assetId: 'asset-1',
            cpu: {
              averageUsagePercent: null,
              minUsagePercent: null,
              maxUsagePercent: null,
              p95UsagePercent: null,
            },
            memory: {
              averageUsagePercent: null,
              minUsagePercent: null,
              maxUsagePercent: null,
              p95UsagePercent: null,
              averageUsedBytes: null,
              maxUsedBytes: null,
              totalBytes: null,
            },
            disks: [],
            networks: [],
          },
          health: [],
        },
      ],
      alerts: {
        totalAlerts: 1,
        severity: { warning: 1, critical: 0 },
        status: { triggered: 1, acknowledged: 0, resolved: 0, closed: 0 },
        activeAlerts: 1,
        metricTypes: { CPU_USAGE: 1 },
        acknowledgementTime: { averageSeconds: null, p95Seconds: null },
        resolutionTime: {
          averageSeconds: null,
          maxSeconds: null,
          p95Seconds: null,
        },
      },
      audit: {
        scope: 'SYSTEM_WIDE',
        summary: {
          totalActions: 0,
          result: { success: 0, failure: 0 },
          actorRoles: {},
          actions: {},
          resources: {},
        },
      },
    };

    const data = buildReportTemplateData({
      reportId: 'report-1',
      reportType: 'ON_DEMAND',
      periodStart: new Date(summary.period.start),
      periodEnd: new Date(summary.period.end),
      generatedBy: 'admin@example.com',
      summary,
    });

    expect(data.scope).toBe('Checkout API');
    expect(data.assets[0]).toMatchObject({
      type: 'Application',
      environment: 'Production',
      status: 'Active',
    });
    expect(data.alertMetricRows).toEqual([
      { metricType: 'CPU Usage', count: 1 },
    ]);
    expect(data.auditEmptyMessage).toBe(
      'No audit activity was recorded during this period.',
    );
  });
});

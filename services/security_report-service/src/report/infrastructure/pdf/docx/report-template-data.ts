import type { GenerateReportPdfInput } from '../../../domain/ports/report-pdf-generator.port';

export interface ReportTemplateData {
  reportId: string;
  reportType: string;

  periodStart: string;
  periodEnd: string;

  generatedBy: string;
  scope: string;

  assets: Array<{
    name: string;
    type: string;
    environment: string;
    status: string;
    cpuAverage: string;
    memoryAverage: string;
  }>;

  metricRows: Array<{
    assetName: string;
    environment: string;

    cpuAverage: string;
    cpuP95: string;
    cpuMax: string;

    memoryAverage: string;
    memoryP95: string;
    memoryMax: string;
  }>;

  diskRows: Array<{
    assetName: string;
    device: string;
    mountpoint: string;
    filesystemType: string;

    total: string;
    used: string;
    available: string;

    averageUsage: string;
    p95Usage: string;
    maxUsage: string;
  }>;

  networkRows: Array<{
    assetName: string;
    device: string;

    averageReceive: string;
    p95Receive: string;
    maxReceive: string;

    averageTransmit: string;
    p95Transmit: string;
    maxTransmit: string;
  }>;

  healthRows: Array<{
    assetName: string;
    url: string;
    enabled: string;

    availability: string;

    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;

    failedHttpChecks: number;
    noResponseChecks: number;

    averageResponseTime: string;
    p95ResponseTime: string;
    maxResponseTime: string;
  }>;

  alertStatus: {
    triggered: number;
    acknowledged: number;
    resolved: number;
    closed: number;
    active: number;
  };

  alertAcknowledgement: {
    average: string;
    p95: string;
  };

  alertResolution: {
    average: string;
    p95: string;
    max: string;
  };

  alertMetricRows: Array<{
    metricType: string;
    count: number;
  }>;

  auditActorRoleRows: Array<{
    role: string;
    count: number;
  }>;

  auditActionRows: Array<{
    action: string;
    count: number;
  }>;

  auditResourceRows: Array<{
    resourceType: string;
    count: number;
  }>;

  totalAlerts: number;
  warningAlerts: number;
  criticalAlerts: number;

  totalAuditActions: number;
  successfulAuditActions: number;
  failedAuditActions: number;

  auditEmptyMessage: string;
}

export function buildReportTemplateData(
  input: GenerateReportPdfInput,
): ReportTemplateData {
  const { summary } = input;

  const assets: ReportTemplateData['assets'] = summary.assets.map(
    ({ asset, metrics }) => ({
      name: asset.name,
      type: formatLabel(
        asset.targetType === 'SERVICE' ? 'APPLICATION' : asset.targetType,
      ),
      environment: formatLabel(asset.environment),
      status: formatAssetStatus(asset.status),

      cpuAverage: formatPercent(metrics.cpu.averageUsagePercent),
      memoryAverage: formatPercent(metrics.memory.averageUsagePercent),
    }),
  );

  const metricRows: ReportTemplateData['metricRows'] = summary.assets.map(
    ({ asset, metrics }) => ({
      assetName: asset.name,
      environment: formatLabel(asset.environment),

      cpuAverage: formatPercent(metrics.cpu.averageUsagePercent),
      cpuP95: formatPercent(metrics.cpu.p95UsagePercent),
      cpuMax: formatPercent(metrics.cpu.maxUsagePercent),

      memoryAverage: formatPercent(metrics.memory.averageUsagePercent),
      memoryP95: formatPercent(metrics.memory.p95UsagePercent),
      memoryMax: formatPercent(metrics.memory.maxUsagePercent),
    }),
  );

  const diskRows: ReportTemplateData['diskRows'] = summary.assets.flatMap(
    ({ asset, metrics }) =>
      metrics.disks.map((disk) => ({
        assetName: asset.name,

        device: disk.device,
        mountpoint: disk.mountpoint,
        filesystemType: disk.filesystemType,

        total: formatBytes(disk.totalBytes),
        used: formatBytes(disk.latestUsedBytes),
        available: formatBytes(disk.latestAvailableBytes),

        averageUsage: formatPercent(disk.averageUsagePercent),
        p95Usage: formatPercent(disk.p95UsagePercent),
        maxUsage: formatPercent(disk.maxUsagePercent),
      })),
  );

  const networkRows: ReportTemplateData['networkRows'] = summary.assets.flatMap(
    ({ asset, metrics }) =>
      metrics.networks.map((network) => ({
        assetName: asset.name,
        device: network.device,

        averageReceive: formatBytesPerSecond(
          network.averageReceiveBytesPerSecond,
        ),

        p95Receive: formatBytesPerSecond(network.p95ReceiveBytesPerSecond),
        maxReceive: formatBytesPerSecond(network.maxReceiveBytesPerSecond),
        averageTransmit: formatBytesPerSecond(
          network.averageTransmitBytesPerSecond,
        ),

        p95Transmit: formatBytesPerSecond(network.p95TransmitBytesPerSecond),
        maxTransmit: formatBytesPerSecond(network.maxTransmitBytesPerSecond),
      })),
  );

  const healthRows: ReportTemplateData['healthRows'] = summary.assets.flatMap(
    ({ asset, health }) =>
      health.map(({ target, summary }) => ({
        assetName: asset.name,
        url: target.url,
        enabled: target.enabled ? 'Enabled' : 'Disabled',
        availability: formatPercent(summary.availabilityPercent),
        totalChecks: summary.totalChecks,
        successfulChecks: summary.successfulChecks,
        failedChecks: summary.failedChecks,
        failedHttpChecks: summary.failedHttpChecks,
        noResponseChecks: summary.noResponseChecks,

        averageResponseTime: formatMilliseconds(summary.responseTime.averageMs),
        p95ResponseTime: formatMilliseconds(summary.responseTime.p95Ms),
        maxResponseTime: formatMilliseconds(summary.responseTime.maxMs),
      })),
  );

  const alertMetricRows: ReportTemplateData['alertMetricRows'] = Object.entries(
    summary.alerts.metricTypes,
  ).map(([metricType, count]) => ({
    metricType: formatLabel(metricType),
    count,
  }));

  const auditActorRoleRows: ReportTemplateData['auditActorRoleRows'] =
    Object.entries(summary.audit.summary.actorRoles).map(([role, count]) => ({
      role: formatLabel(role),
      count,
    }));

  const auditActionRows: ReportTemplateData['auditActionRows'] = Object.entries(
    summary.audit.summary.actions,
  ).map(([action, count]) => ({
    action: formatLabel(action),
    count,
  }));

  const auditResourceRows: ReportTemplateData['auditResourceRows'] =
    Object.entries(summary.audit.summary.resources).map(
      ([resourceType, count]) => ({
        resourceType: formatLabel(resourceType),
        count,
      }),
    );

  return {
    reportId: input.reportId,

    reportType: input.reportType === 'MONTHLY' ? 'Monthly' : 'On Demand',

    periodStart: formatDate(input.periodStart),
    periodEnd: formatDate(input.periodEnd),

    generatedBy: input.generatedBy ?? 'System',

    scope:
      summary.scope.type === 'ALL_ASSETS'
        ? 'All Assets'
        : (summary.scope.assetName ?? summary.scope.assetId ?? '-'),

    assets,
    metricRows,
    diskRows,
    networkRows,
    healthRows,

    totalAlerts: summary.alerts.totalAlerts,
    warningAlerts: summary.alerts.severity.warning,
    criticalAlerts: summary.alerts.severity.critical,
    alertStatus: {
      triggered: summary.alerts.status.triggered,
      acknowledged: summary.alerts.status.acknowledged,
      resolved: summary.alerts.status.resolved,
      closed: summary.alerts.status.closed,
      active: summary.alerts.activeAlerts,
    },

    alertAcknowledgement: {
      average: formatSeconds(summary.alerts.acknowledgementTime.averageSeconds),

      p95: formatSeconds(summary.alerts.acknowledgementTime.p95Seconds),
    },

    alertResolution: {
      average: formatSeconds(summary.alerts.resolutionTime.averageSeconds),

      p95: formatSeconds(summary.alerts.resolutionTime.p95Seconds),

      max: formatSeconds(summary.alerts.resolutionTime.maxSeconds),
    },

    alertMetricRows,
    totalAuditActions: summary.audit.summary.totalActions,
    successfulAuditActions: summary.audit.summary.result.success,
    failedAuditActions: summary.audit.summary.result.failure,
    auditEmptyMessage:
      summary.audit.summary.totalActions === 0
        ? 'No audit activity was recorded during this period.'
        : '',

    auditActorRoleRows,
    auditActionRows,
    auditResourceRows,
  };
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toFixed(2)}%`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatBytes(value: number | null): string {
  if (value === null) {
    return '-';
  }

  if (value === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];

  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );

  const formatted = value / 1024 ** index;

  return `${formatted.toFixed(2)} ${units[index]}`;
}

function formatBytesPerSecond(value: number | null): string {
  if (value === null) {
    return '-';
  }

  if (value === 0) {
    return '0 B/s';
  }

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];

  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );

  const formatted = value / 1024 ** index;

  return `${formatted.toFixed(2)} ${units[index]}`;
}

function formatMilliseconds(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toFixed(2)} ms`;
}

function formatSeconds(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return `${value.toFixed(2)} s`;
}

function formatAssetStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVATE: 'Active',
    INACTIVATE: 'Inactive',
    DEACTIVATE: 'Deactivated',
  };

  return labels[status] ?? formatLabel(status);
}

function formatLabel(value: string): string {
  const acronyms = new Set([
    'API',
    'CPU',
    'HTTP',
    'HTTPS',
    'ID',
    'IP',
    'RX',
    'TX',
    'URL',
  ]);

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();

      if (acronyms.has(upper)) {
        return upper;
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

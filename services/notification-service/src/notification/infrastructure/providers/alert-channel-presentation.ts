import type { SendChannelNotificationInput } from '../../domain/ports/notification-sender.port';

type Alert = SendChannelNotificationInput['alert'];

export interface AlertChannelPresentation {
  indicator: string;
  eventLabel: string;
  sourceName: string;
  severityLabel: string;
  details: string;
  reason?: string;
  referenceLabel: 'Rule ID' | 'Target ID';
  dashboardUrl?: string;
  dashboardLabel: string;
}

export function alertChannelPresentation(
  alert: Alert,
  dashboardPublicUrl?: string,
): AlertChannelPresentation {
  const resolved = alert.status === 'RESOLVED';
  const severityLabel = alert.severity === 'CRITICAL' ? 'Critical' : 'Warning';
  const sourceName = displaySourceName(alert);

  return {
    indicator: resolved
      ? '🟢 Resolved'
      : `${alert.severity === 'CRITICAL' ? '🔴' : '🟠'} ${severityLabel}`,
    eventLabel: eventLabel(alert),
    sourceName,
    severityLabel,
    details: details(alert, sourceName),
    ...(alert.resolutionReason
      ? { reason: alert.resolutionReason.replaceAll('_', ' ').toLowerCase() }
      : {}),
    referenceLabel:
      alert.alertType === 'METRIC_THRESHOLD' ||
      alert.alertType === 'LOG_FINDING'
        ? 'Rule ID'
        : 'Target ID',
    dashboardUrl: dashboardLink(alert, dashboardPublicUrl),
    dashboardLabel:
      alert.alertType === 'LOG_FINDING'
        ? 'View logs in dashboard'
        : 'View alert in dashboard',
  };
}

function eventLabel(alert: Alert): string {
  if (alert.alertType === 'LOG_FINDING') {
    return `Log finding · ${alert.title}`;
  }
  if (alert.alertType === 'METRIC_THRESHOLD') {
    return `${metricLabel(alert.metricType)} alert`;
  }
  if (alert.alertType === 'HEALTH_CHECK_STALE') {
    if (alert.status !== 'RESOLVED') return 'Health check data stale';
    if (alert.resolutionReason === 'HEALTH_CHECK_DATA_RESUMED') {
      return 'Health check data resumed';
    }
    if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_PAUSED') {
      return 'Health check paused';
    }
    if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_ARCHIVED') {
      return 'Health check archived';
    }
    return 'Health check alert ended';
  }
  if (alert.status !== 'RESOLVED') return 'Health check failed';
  if (alert.resolutionReason === 'HEALTH_CHECK_DATA_STALE') {
    return 'Health check data stale';
  }
  if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_PAUSED') {
    return 'Health check paused';
  }
  if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_ARCHIVED') {
    return 'Health check archived';
  }
  return 'Health check recovered';
}

function displaySourceName(alert: Alert): string {
  const name = alert.sourceName?.trim();
  if (name) {
    if (
      alert.alertType === 'ENDPOINT_UNAVAILABLE' ||
      alert.alertType === 'HEALTH_CHECK_STALE'
    ) {
      try {
        const url = new URL(name);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return `${url.hostname}${url.pathname === '/' ? '' : ` · ${url.pathname}`}`;
        }
      } catch {
        return name;
      }
    }
    return name;
  }
  if (alert.alertType === 'METRIC_THRESHOLD') {
    return alert.assetId
      ? `Asset ${alert.assetId.slice(0, 8)}`
      : `Rule ${alert.sourceId.slice(0, 8)}`;
  }
  if (alert.alertType === 'LOG_FINDING') return alert.title;
  return `Target ${alert.sourceId.slice(0, 8)}`;
}

function details(alert: Alert, source: string): string {
  if (alert.alertType === 'METRIC_THRESHOLD') {
    if (alert.resolutionReason?.startsWith('METRIC_RULE_')) {
      return `The ${metricLabel(alert.metricType)} alert for ${source} ended because the rule was ${alert.resolutionReason.split('_').at(-1)?.toLowerCase()}.`;
    }
    return alert.message;
  }
  if (alert.alertType === 'LOG_FINDING') return alert.message;
  if (alert.resolutionReason === 'HEALTH_CHECK_DATA_RESUMED') {
    return `Health check data resumed for ${source}.`;
  }
  if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_PAUSED') {
    return `Monitoring for ${source} was paused; the open alert was resolved.`;
  }
  if (alert.resolutionReason === 'HEALTH_CHECK_TARGET_ARCHIVED') {
    return `The health check ${source} was archived; the open alert was resolved.`;
  }
  if (alert.resolutionReason === 'HEALTH_CHECK_DATA_STALE') {
    return `Recent results for ${source} stopped arriving; the previous alert was resolved.`;
  }
  if (alert.status === 'RESOLVED') return `Health check ${source} recovered.`;
  if (alert.alertType === 'HEALTH_CHECK_STALE') {
    return `No recent health check result for ${source}.`;
  }
  const diagnostic = alert.message.match(
    /:\s*(HTTP \d+|No response|fetch failed)$/i,
  )?.[1];
  return `Health check ${source} failed${diagnostic ? `: ${diagnostic}` : '.'}`;
}

function dashboardLink(alert: Alert, configured?: string): string | undefined {
  if (!configured) return undefined;
  try {
    const base = new URL(configured);
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password
    ) {
      return undefined;
    }
    if (alert.alertType === 'LOG_FINDING') {
      if (alert.actionUrl) {
        try {
          const deepLink = new URL(alert.actionUrl);
          if (
            deepLink.origin === base.origin &&
            deepLink.pathname === '/explorer'
          ) {
            return deepLink.toString();
          }
        } catch {
          // A malformed deep link still falls back to the dashboard Explorer.
        }
      }
      return new URL('/explorer', base).toString();
    }
    return new URL(
      `/alerts/${encodeURIComponent(alert.alertId)}`,
      base,
    ).toString();
  } catch {
    return undefined;
  }
}

function metricLabel(value: string): string {
  const labels: Record<string, string> = {
    CPU_USAGE: 'CPU usage',
    MEMORY_USAGE: 'Memory usage',
    DISK_USAGE: 'Disk usage',
  };
  return labels[value] ?? value.replaceAll('_', ' ').toLowerCase();
}

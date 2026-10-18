import type { SendNotificationInput } from '../../domain/ports/notification-sender.port';

export interface AlertEmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildAlertEmail(
  input: SendNotificationInput,
): AlertEmailContent {
  const resolved = input.status === 'RESOLVED';

  const severityLabel = toTitleCase(input.severity);
  const metricLabel = formatMetric(input.metricType);
  const eventTimeLabel = resolved ? 'Resolved at' : 'Triggered at';
  const occurredAt = formatBangkokTime(input.occurredAt);
  const headline = buildHeadline(input);
  const sourceName = emailSourceName(input);
  const summary = buildSummary(input, sourceName);
  const category =
    input.alertType === 'LOG_FINDING'
      ? 'Log finding'
      : input.alertType === 'METRIC_THRESHOLD'
        ? 'Metric alert'
        : 'Health check';
  const actionLabel =
    input.alertType === 'LOG_FINDING'
      ? 'View logs in dashboard'
      : 'View alert in dashboard';
  const referenceLabel =
    input.alertType === 'METRIC_THRESHOLD' || input.alertType === 'LOG_FINDING'
      ? 'Rule ID'
      : 'Health check target ID';
  const referenceId = input.sourceId;

  const accentColor = resolved
    ? '#059669'
    : input.severity === 'CRITICAL'
      ? '#dc2626'
      : '#d97706';

  const subjectStatus = resolved
    ? '🟢 Resolved'
    : `${severityEmoji(input.severity)} ${severityLabel}`;
  const subject = `${subjectStatus} · ${buildSubjectEvent(input)} · ${sourceName}${input.alertType === 'LOG_FINDING' ? ` · ${input.title}` : ''}`;

  const text = [
    category,
    '',
    resolved
      ? `🟢 RESOLVED · Previously ${severityLabel.toUpperCase()}`
      : `${severityEmoji(input.severity)} ${severityLabel.toUpperCase()} · TRIGGERED`,
    headline,
    '',
    summary,
    ...(input.actionUrl ? [`${actionLabel}: ${input.actionUrl}`] : []),
    '',
    `Source: ${sourceName}`,
    `Signal: ${metricLabel}`,
    `${eventTimeLabel}: ${occurredAt}`,
    ...(input.resolutionReason
      ? [`Resolution reason: ${formatReason(input.resolutionReason)}`]
      : []),
    '',
    'Technical reference',
    `${referenceLabel}: ${referenceId}`,
    ...(input.assetId ? [`Asset ID: ${input.assetId}`] : []),
    `Alert ID: ${input.alertId}`,
    '',
    'Automated alert notification.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>

  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(summary)}
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="width:100%;background:#f1f5f9;padding:24px 12px;"
    >
      <tr>
        <td align="center">

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              width:100%;
              max-width:640px;
              background:#ffffff;
              border:1px solid #cbd5e1;
              border-radius:8px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                style="
                  background:#0f172a;
                  padding:20px 28px;
                  color:#ffffff;
                "
              >
                <div style="font-size:18px;font-weight:700;">
                  ${escapeHtml(category)}
                </div>

                <div
                  style="
                    margin-top:4px;
                    font-size:13px;
                    color:#cbd5e1;
                  "
                >
                  ${escapeHtml(sourceName)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 28px 28px;">

                <div
                  style="
                    font-size:12px;
                    line-height:1.4;
                    font-weight:700;
                    letter-spacing:0.04em;
                    color:${accentColor};
                  "
                >
                  ${resolved ? '🟢 RESOLVED' : `${severityEmoji(input.severity)} ${escapeHtml(severityLabel.toUpperCase())} · TRIGGERED`}
                </div>

                <h1
                  style="
                    margin:10px 0 8px;
                    font-size:24px;
                    line-height:1.3;
                    color:#0f172a;
                  "
                >
                  ${escapeHtml(headline)}
                </h1>

                <p
                  style="
                    margin:0;
                    font-size:15px;
                    line-height:1.65;
                    color:#334155;
                  "
                >
                  ${escapeHtml(summary)}
                </p>

                ${input.actionUrl ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(actionLabel)}</a></p>` : ''}

                <div
                  style="
                    margin-top:26px;
                    padding-top:6px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  ${detailItem('Source', sourceName)}
                  ${detailItem('Signal', metricLabel)}
                  ${detailItem(resolved ? 'Previous severity' : 'Severity', severityLabel)}
                  ${detailItem(eventTimeLabel, occurredAt)}

                  ${
                    input.resolutionReason
                      ? detailItem(
                          'Resolution reason',
                          formatReason(input.resolutionReason),
                        )
                      : ''
                  }
                </div>

                <div
                  style="
                    margin-top:22px;
                    padding-top:18px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  <div
                    style="
                      margin-bottom:7px;
                      font-size:11px;
                      font-weight:700;
                      letter-spacing:0.04em;
                      text-transform:uppercase;
                      color:#94a3b8;
                    "
                  >
                    Technical reference
                  </div>

                  <div
                    style="
                      font-family:Consolas,Monaco,monospace;
                      font-size:11px;
                      line-height:1.7;
                      color:#94a3b8;
                      word-break:break-all;
                    "
                  >
                    ${referenceLabel}: ${escapeHtml(referenceId)}
                    ${input.assetId ? `<br>Asset ID: ${escapeHtml(input.assetId)}` : ''}
                    <br>
                    Alert ID: ${escapeHtml(input.alertId)}
                  </div>
                </div>

              </td>
            </tr>

            <tr>
              <td
                style="
                  background:#f8fafc;
                  border-top:1px solid #e2e8f0;
                  padding:15px 28px;
                  font-size:12px;
                  line-height:1.5;
                  color:#64748b;
                "
              >
                Automated alert notification.
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    text,
    html,
  };
}

function detailItem(label: string, value: string): string {
  return `
    <div
      style="
        padding:12px 0;
        border-bottom:1px solid #f1f5f9;
      "
    >
      <div
        style="
          margin-bottom:3px;
          font-size:12px;
          line-height:1.4;
          color:#64748b;
        "
      >
        ${escapeHtml(label)}
      </div>

      <div
        style="
          font-size:14px;
          line-height:1.5;
          font-weight:600;
          color:#0f172a;
        "
      >
        ${escapeHtml(value)}
      </div>
    </div>
  `;
}

function buildHeadline(input: SendNotificationInput): string {
  const resolved = input.status === 'RESOLVED';

  if (input.alertType === 'LOG_FINDING') {
    return input.title;
  }

  if (input.alertType === 'METRIC_THRESHOLD') {
    if (resolved && input.resolutionReason?.startsWith('METRIC_RULE_')) {
      return `${formatMetric(input.metricType)} alert ended (${formatReason(input.resolutionReason).replace('Metric Rule ', 'rule ').toLowerCase()})`;
    }
    return resolved
      ? `${formatMetric(input.metricType)} alert resolved`
      : `${formatMetric(input.metricType)} threshold exceeded`;
  }

  if (input.alertType === 'HEALTH_CHECK_STALE') {
    return resolved
      ? 'Health check alert resolved'
      : 'Health check data is stale';
  }

  return resolved ? 'Health check alert resolved' : 'Health check failed';
}

function buildSubjectEvent(input: SendNotificationInput): string {
  if (input.alertType === 'LOG_FINDING') return 'Log finding';
  if (input.alertType === 'METRIC_THRESHOLD') {
    const change = input.resolutionReason?.startsWith('METRIC_RULE_')
      ? ` (rule ${input.resolutionReason.split('_').at(-1)?.toLowerCase()})`
      : '';
    return `${formatMetric(input.metricType)}${change}`;
  }
  if (input.alertType === 'HEALTH_CHECK_STALE') {
    if (input.status !== 'RESOLVED') return 'Health check data stale';
    return input.resolutionReason === 'HEALTH_CHECK_DATA_RESUMED'
      ? 'Health check data resumed'
      : 'Health check alert ended';
  }
  if (input.resolutionReason === 'HEALTH_CHECK_DATA_STALE') {
    return 'Health check data stale';
  }
  if (input.resolutionReason === 'HEALTH_CHECK_TARGET_PAUSED') {
    return 'Health check paused';
  }
  if (input.resolutionReason === 'HEALTH_CHECK_TARGET_ARCHIVED') {
    return 'Health check archived';
  }
  return input.status === 'RESOLVED'
    ? 'Health check recovered'
    : 'Health check failed';
}

function severityEmoji(severity: SendNotificationInput['severity']): string {
  return severity === 'CRITICAL' ? '🔴' : '🟠';
}

function fallbackSourceName(input: SendNotificationInput): string {
  if (input.alertType === 'LOG_FINDING') return input.title;
  if (input.alertType === 'METRIC_THRESHOLD') {
    return input.assetId
      ? `Asset ${input.assetId.slice(0, 8)}`
      : `Rule ${input.sourceId.slice(0, 8)}`;
  }
  return `Target ${input.sourceId.slice(0, 8)}`;
}

function emailSourceName(input: SendNotificationInput): string {
  const name = input.sourceName?.trim() || fallbackSourceName(input);
  if (
    input.alertType !== 'ENDPOINT_UNAVAILABLE' &&
    input.alertType !== 'HEALTH_CHECK_STALE'
  ) {
    return name;
  }
  try {
    const url = new URL(name);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.hostname}${url.pathname === '/' ? '' : ` · ${url.pathname}`}`;
    }
  } catch {
    // Custom target names are displayed as written.
  }
  return name;
}

function buildSummary(
  input: SendNotificationInput,
  sourceName: string,
): string {
  if (
    input.alertType === 'METRIC_THRESHOLD' &&
    input.resolutionReason?.startsWith('METRIC_RULE_')
  ) {
    const change =
      {
        METRIC_RULE_UPDATED: 'updated',
        METRIC_RULE_DISABLED: 'disabled',
        METRIC_RULE_ARCHIVED: 'archived',
      }[input.resolutionReason] ?? 'changed';
    return `The ${formatMetric(input.metricType)} alert for ${sourceName} ended because the rule was ${change}.`;
  }
  if (
    input.alertType !== 'ENDPOINT_UNAVAILABLE' &&
    input.alertType !== 'HEALTH_CHECK_STALE'
  ) {
    return input.message;
  }

  if (input.resolutionReason === 'HEALTH_CHECK_DATA_RESUMED') {
    return `Health check data resumed for ${sourceName}.`;
  }
  if (input.resolutionReason === 'HEALTH_CHECK_TARGET_PAUSED') {
    return `Monitoring for ${sourceName} was paused; the open alert was resolved.`;
  }
  if (input.resolutionReason === 'HEALTH_CHECK_TARGET_ARCHIVED') {
    return `The health check ${sourceName} was archived; the open alert was resolved.`;
  }
  if (input.resolutionReason === 'HEALTH_CHECK_DATA_STALE') {
    return `Recent results for ${sourceName} stopped arriving; the previous alert was resolved.`;
  }
  if (input.status === 'RESOLVED') {
    return `Health check ${sourceName} recovered.`;
  }
  if (input.alertType === 'HEALTH_CHECK_STALE') {
    return `No recent health check result for ${sourceName}.`;
  }

  const detail = input.message.match(
    /:\s*(HTTP \d+|No response|fetch failed)$/i,
  )?.[1];
  return `Health check ${sourceName} failed${detail ? `: ${detail}` : '.'}`;
}

function formatBangkokTime(value: Date): string {
  return `${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)} (Asia/Bangkok)`;
}

function formatMetric(value: string): string {
  const labels: Record<string, string> = {
    HTTP: 'HTTP',
    CPU: 'CPU',
    CPU_USAGE: 'CPU Usage',
    MEMORY: 'Memory',
    MEMORY_USAGE: 'Memory Usage',
    DISK: 'Disk',
    DISK_USAGE: 'Disk Usage',
    NETWORK: 'Network',
  };

  return (
    labels[value] ??
    value
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatReason(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toTitleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

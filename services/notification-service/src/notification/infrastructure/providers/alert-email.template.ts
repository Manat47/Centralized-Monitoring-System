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

  const statusLabel = resolved ? 'Resolved' : 'Triggered';
  const severityLabel = toTitleCase(input.severity);
  const metricLabel = formatMetric(input.metricType);
  const eventTimeLabel = resolved ? 'Resolved at' : 'Triggered at';
  const occurredAt = formatBangkokTime(input.occurredAt);
  const headline = buildHeadline(input);

  const accentColor = resolved
    ? '#059669'
    : input.severity === 'CRITICAL'
      ? '#dc2626'
      : '#d97706';

  const subject = `[Centralized Monitoring] ${severityLabel} alert ${statusLabel.toLowerCase()}`;

  const text = [
    'Centralized Monitoring',
    '',
    `${severityLabel.toUpperCase()} · ${statusLabel.toUpperCase()}`,
    headline,
    '',
    input.message,
    '',
    `Signal: ${metricLabel}`,
    `${eventTimeLabel}: ${occurredAt}`,
    ...(input.resolutionReason
      ? [`Resolution reason: ${formatReason(input.resolutionReason)}`]
      : []),
    '',
    'Technical reference',
    `Asset ID: ${input.assetId}`,
    `Alert ID: ${input.alertId}`,
    '',
    'Automated notification from Centralized Monitoring.',
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
      ${escapeHtml(input.message)}
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
                  Centralized Monitoring
                </div>

                <div
                  style="
                    margin-top:4px;
                    font-size:13px;
                    color:#cbd5e1;
                  "
                >
                  Operational alert notification
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
                  ${escapeHtml(severityLabel.toUpperCase())}
                  &nbsp;·&nbsp;
                  ${escapeHtml(statusLabel.toUpperCase())}
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
                  ${escapeHtml(input.message)}
                </p>

                <div
                  style="
                    margin-top:26px;
                    padding-top:6px;
                    border-top:1px solid #e2e8f0;
                  "
                >
                  ${detailItem('Signal', metricLabel)}
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
                    Asset ID: ${escapeHtml(input.assetId)}
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
                Automated notification from Centralized Monitoring.
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

  if (input.alertType === 'METRIC_THRESHOLD') {
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

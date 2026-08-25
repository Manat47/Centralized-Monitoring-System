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
  const accentColor = resolved
    ? '#059669'
    : input.severity === 'CRITICAL'
      ? '#dc2626'
      : '#d97706';
  const accentBackground = resolved
    ? '#ecfdf5'
    : input.severity === 'CRITICAL'
      ? '#fff1f2'
      : '#fffbeb';
  const occurredAt = formatBangkokTime(input.occurredAt);
  const subject = `[Centralized Monitoring] ${severityLabel} alert ${statusLabel.toLowerCase()}`;

  const text = [
    'Centralized Monitoring',
    '',
    `${severityLabel} alert ${statusLabel.toLowerCase()}`,
    input.message,
    '',
    `Status: ${statusLabel}`,
    `Severity: ${severityLabel}`,
    `Metric: ${formatMetric(input.metricType)}`,
    `Occurred at: ${occurredAt}`,
    ...(input.resolutionReason
      ? [`Resolution reason: ${formatReason(input.resolutionReason)}`]
      : []),
    '',
    'Reference',
    `Asset ID: ${input.assetId}`,
    `Alert ID: ${input.alertId}`,
    '',
    'This is an automated operational notification from Centralized Monitoring.',
  ].join('\n');

  const reasonRow = input.resolutionReason
    ? detailRow('Resolution reason', formatReason(input.resolutionReason))
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.message)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;padding:20px 24px;color:#ffffff;">
                <div style="font-size:18px;font-weight:700;">Centralized Monitoring</div>
                <div style="margin-top:4px;font-size:13px;color:#cbd5e1;">Operational alert notification</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="display:inline-block;border:1px solid ${accentColor};border-radius:999px;background:${accentBackground};padding:5px 10px;color:${accentColor};font-size:12px;font-weight:700;text-transform:uppercase;">
                  ${escapeHtml(statusLabel)}
                </div>
                <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:#0f172a;">${escapeHtml(severityLabel)} alert ${escapeHtml(statusLabel.toLowerCase())}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(input.message)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;">
                  ${detailRow('Status', statusLabel)}
                  ${detailRow('Severity', severityLabel)}
                  ${detailRow('Metric', formatMetric(input.metricType))}
                  ${detailRow('Occurred at', occurredAt)}
                  ${reasonRow}
                </table>

                <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:18px;">
                  <div style="margin-bottom:8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;">Reference</div>
                  <div style="font-family:Consolas,monospace;font-size:12px;line-height:1.7;color:#64748b;word-break:break-all;">
                    Asset ID: ${escapeHtml(input.assetId)}<br>
                    Alert ID: ${escapeHtml(input.alertId)}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;font-size:12px;line-height:1.5;color:#64748b;">
                This is an automated operational notification from Centralized Monitoring.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="width:38%;border-bottom:1px solid #e2e8f0;background:#f8fafc;padding:11px 14px;font-size:13px;color:#64748b;">${escapeHtml(label)}</td>
    <td style="border-bottom:1px solid #e2e8f0;padding:11px 14px;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(value)}</td>
  </tr>`;
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
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatReason(value: string): string {
  return formatMetric(value);
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

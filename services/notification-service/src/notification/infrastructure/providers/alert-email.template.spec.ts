import type { SendNotificationInput } from '../../domain/ports/notification-sender.port';
import { buildAlertEmail } from './alert-email.template';

describe('buildAlertEmail', () => {
  const input: SendNotificationInput = {
    recipientEmail: 'operator@example.com',
    alertId: 'alert-1',
    assetId: 'asset-1',
    sourceId: 'target-1',
    sourceName: 'register-uasportal',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    alertType: 'ENDPOINT_UNAVAILABLE',
    metricType: 'HTTP',
    resolutionReason: 'HEALTH_CHECK_RECOVERED',
    title: 'CRITICAL alert resolved',
    message: 'Health check recovered for http://localhost:3005/api/metrics',
    occurredAt: new Date('2026-08-25T12:13:40.076Z'),
  };

  it('builds a structured multipart alert email', () => {
    const email = buildAlertEmail(input);

    expect(email.subject).toBe(
      '🟢 Resolved · Health check recovered · register-uasportal',
    );
    expect(email.text).toContain('RESOLVED');
    expect(email.text).toContain('Source: register-uasportal');
    expect(email.text).toContain('Resolved at: 25 Aug 2026');
    expect(email.text).not.toContain('http://localhost:3005');
    expect(email.html).toContain('<!doctype html>');
    expect(email.html).not.toContain('Centralized Monitoring');
    expect(email.html).toContain('Health Check Recovered');
  });

  it('escapes dynamic content in the HTML body', () => {
    const email = buildAlertEmail({
      ...input,
      alertType: 'LOG_FINDING',
      status: 'TRIGGERED',
      resolutionReason: undefined,
      message: '<script>alert("unsafe")</script>',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain(
      '&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;',
    );
  });

  it('uses the health check target as the reference for a standalone alert', () => {
    const email = buildAlertEmail({ ...input, assetId: null });

    expect(email.text).toContain('Health check target ID: target-1');
    expect(email.html).toContain('Health check target ID: target-1');
    expect(email.text).not.toContain('Asset ID: null');
  });

  it('shows the rule title and rule ID for a log finding', () => {
    const email = buildAlertEmail({
      ...input,
      assetId: null,
      sourceId: 'rule-1',
      alertType: 'LOG_FINDING',
      metricType: 'LOG_FINDING',
      status: 'TRIGGERED',
      resolutionReason: undefined,
      title: 'Database errors',
      message: '5 matching logs',
    });

    expect(email.text).toContain('Database errors');
    expect(email.text).toContain('Rule ID: rule-1');
    expect(email.html).toContain('Database errors');
  });

  it('renders an absolute Explorer link as a clickable email action', () => {
    const url =
      'https://monitor.example/explorer?projectId=c4259ce4-c164-4b62-a11a-8aa01d939096';
    const email = buildAlertEmail({
      ...input,
      assetId: null,
      alertType: 'LOG_FINDING',
      metricType: 'LOG_FINDING',
      status: 'TRIGGERED',
      resolutionReason: undefined,
      message: '3 matching logs in 60s from qa_finding.',
      actionUrl: url,
    });

    expect(email.text).toContain(`View logs in dashboard: ${url}`);
    expect(email.html).toContain(
      `href="https://monitor.example/explorer?projectId=c4259ce4-c164-4b62-a11a-8aa01d939096"`,
    );
    expect(email.html).toContain('View logs in dashboard');
  });

  it('identifies a metric rule update and the affected asset', () => {
    const email = buildAlertEmail({
      ...input,
      assetId: 'asset-1',
      sourceId: 'rule-1',
      sourceName: 'User_server',
      alertType: 'METRIC_THRESHOLD',
      metricType: 'CPU_USAGE',
      resolutionReason: 'METRIC_RULE_UPDATED',
      message: 'Metric alert resolved because its rule configuration changed',
    });

    expect(email.subject).toContain('User_server');
    expect(email.subject).toContain('rule updated');
    expect(email.text).toContain('Rule ID: rule-1');
    expect(email.text).toContain('rule was updated');
  });

  it('links a health alert to the dashboard without linking the monitored URL', () => {
    const email = buildAlertEmail({
      ...input,
      status: 'TRIGGERED',
      resolutionReason: undefined,
      message:
        'Health check failed for https://customer.example/health: HTTP 503',
      actionUrl: 'https://monitor.example/alerts/alert-1',
    });

    expect(email.subject).toContain('🔴 Critical');
    expect(email.text).toContain('HTTP 503');
    expect(email.text).not.toContain('https://customer.example/health');
    expect(email.html).toContain(
      'href="https://monitor.example/alerts/alert-1"',
    );
    expect(email.html).not.toContain('href="https://customer.example/health"');
  });

  it('shows a URL-based default target name as readable host and path', () => {
    const email = buildAlertEmail({
      ...input,
      sourceName: 'https://customer.example/api/health',
    });

    expect(email.subject).toContain('customer.example · /api/health');
    expect(email.text).not.toContain('https://customer.example/api/health');
  });
});

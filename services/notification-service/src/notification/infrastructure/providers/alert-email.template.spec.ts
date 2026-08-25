import type { SendNotificationInput } from '../../domain/ports/notification-sender.port';
import { buildAlertEmail } from './alert-email.template';

describe('buildAlertEmail', () => {
  const input: SendNotificationInput = {
    recipientEmail: 'operator@example.com',
    alertId: 'alert-1',
    assetId: 'asset-1',
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
      '[Centralized Monitoring] Critical alert resolved',
    );
    expect(email.text).toContain('Status: Resolved');
    expect(email.text).toContain('Occurred at: 25 Aug 2026');
    expect(email.html).toContain('<!doctype html>');
    expect(email.html).toContain('Operational alert notification');
    expect(email.html).toContain('Health Check Recovered');
  });

  it('escapes dynamic content in the HTML body', () => {
    const email = buildAlertEmail({
      ...input,
      message: '<script>alert("unsafe")</script>',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain(
      '&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;',
    );
  });
});

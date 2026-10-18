import { createHmac } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import axios, { type AxiosError } from 'axios';
import * as nodemailer from 'nodemailer';

import type { SendChannelNotificationInput } from '../../domain/ports/notification-sender.port';
import { GmailSmtpNotificationSender } from './gmail-smtp-notification.sender';
import { LineNotificationSender } from './line-notification.sender';
import { SlackNotificationSender } from './slack-notification.sender';
import { WebhookNotificationSender } from './webhook-notification.sender';

jest.mock('axios');
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const input: SendChannelNotificationInput = {
  destination: 'recipient',
  secretToken: 'shared-secret',
  alert: {
    alertId: 'alert-1',
    assetId: null,
    sourceId: 'target-1',
    severity: 'WARNING',
    status: 'TRIGGERED',
    alertType: 'ENDPOINT_UNAVAILABLE',
    metricType: 'HTTP',
    title: 'Endpoint unavailable',
    message: 'Connection refused',
    occurredAt: new Date('2026-10-04T00:00:00.000Z'),
  },
};

const post = jest.spyOn(axios, 'post');

function httpError(status: number): AxiosError {
  return { isAxiosError: true, response: { status } } as AxiosError;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(axios, 'isAxiosError')
    .mockImplementation(
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        error.isAxiosError === true,
    );
});

describe('GmailSmtpNotificationSender adapter', () => {
  const sendMail = jest.fn();
  const config = {
    get: (key: string) =>
      ({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'app-password' })[key],
  } as ConfigService;

  beforeEach(() => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    sendMail.mockResolvedValue({});
  });

  it('sends alert email and returns success', async () => {
    const sender = new GmailSmtpNotificationSender(config);
    const result = await sender.sendAlert({
      ...input,
      destination: 'to@example.com',
    });

    expect(result).toEqual({ success: true, isTransientError: false });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'to@example.com' }),
    );
  });

  it('classifies SMTP limits as transient and permanent failures as permanent', async () => {
    const sender = new GmailSmtpNotificationSender(config);
    sendMail.mockRejectedValueOnce({ responseCode: 454 });
    expect(await sender.sendAlert(input)).toMatchObject({
      success: false,
      isTransientError: true,
    });
    sendMail.mockRejectedValueOnce({ responseCode: 550 });
    expect(await sender.sendAlert(input)).toMatchObject({
      success: false,
      isTransientError: false,
    });
  });
});

describe('LineNotificationSender adapter', () => {
  const config = {
    get: (key: string) =>
      ({
        LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
        DASHBOARD_PUBLIC_URL: 'https://monitor.example',
      })[key],
  } as ConfigService;

  it('posts a push message using the configured token', async () => {
    post.mockResolvedValueOnce({});

    const result = await new LineNotificationSender(config).sendAlert(input);

    expect(result.success).toBe(true);
    expect(post).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({ to: 'recipient' }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer line-token' },
      }),
    );
  });

  it('names the source, severity, and dashboard alert in the push message', async () => {
    post.mockResolvedValueOnce({});
    await new LineNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        sourceName: 'register-uasportal',
        message:
          'Health check failed for https://customer.example/api/health: HTTP 503',
      },
    });
    const payload = post.mock.calls[0]?.[1] as {
      messages: Array<{ text: string }>;
    };
    const message = payload.messages[0].text;
    expect(message).toContain('🟠 Warning · Health check failed');
    expect(message).toContain('Source: register-uasportal');
    expect(message).toContain('Severity: Warning');
    expect(message).toContain('HTTP 503');
    expect(message).toContain('Target ID: target-1');
    expect(message).toContain(
      'View alert in dashboard: https://monitor.example/alerts/alert-1',
    );
    expect(message).not.toContain('https://customer.example/api/health');
  });

  it('uses the dashboard Explorer link for a log finding', async () => {
    post.mockResolvedValueOnce({});
    await new LineNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'LOG_FINDING',
        sourceName: 'payment-service',
        title: 'Payment timeout',
        sourceId: 'rule-1',
        actionUrl: 'https://monitor.example/explorer?service=payment-service',
      },
    });
    const payload = post.mock.calls[0]?.[1] as {
      messages: Array<{ text: string }>;
    };
    expect(payload.messages[0].text).toContain('Source: payment-service');
    expect(payload.messages[0].text).toContain('Rule ID: rule-1');
    expect(payload.messages[0].text).toContain(
      'View logs in dashboard: https://monitor.example/explorer?service=payment-service',
    );
  });

  it('keeps the dashboard link after a long log snippet', async () => {
    post.mockResolvedValueOnce({});
    await new LineNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'LOG_FINDING',
        message: 'x'.repeat(6000),
      },
    });
    const payload = post.mock.calls[0]?.[1] as {
      messages: Array<{ text: string }>;
    };
    expect(payload.messages[0].text.length).toBeLessThanOrEqual(5000);
    expect(payload.messages[0].text).toContain(
      'View logs in dashboard: https://monitor.example/explorer',
    );
  });

  it('returns a permanent failure if the token is missing', async () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    expect(
      await new LineNotificationSender(config).sendAlert(input),
    ).toMatchObject({
      success: false,
      isTransientError: false,
    });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('SlackNotificationSender adapter', () => {
  const config = {
    get: (key: string) =>
      key === 'DASHBOARD_PUBLIC_URL' ? 'https://monitor.example' : undefined,
  } as ConfigService;

  it('posts alert text to the incoming webhook', async () => {
    post.mockResolvedValueOnce({});
    const result = await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: { ...input.alert, sourceName: 'register-uasportal' },
    });

    expect(result.success).toBe(true);
    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(post.mock.calls[0][0]).toBe('recipient');
    expect(post.mock.calls[0][2]).toEqual({ timeout: 10000 });
    expect(message).toContain(
      '🟠 Warning · *Health check failed*\n*Source:* register-uasportal',
    );
    expect(message).toContain(
      '<https://monitor.example/alerts/alert-1|View alert in dashboard>',
    );
    expect(message).not.toContain('https://example.com/health');
  });

  it('shows a URL-based target name without linking to the monitored site', async () => {
    post.mockResolvedValueOnce({});
    await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        sourceName: 'https://customer.example/api/health',
        message:
          'Health check failed for https://customer.example/api/health: HTTP 503',
      },
    });

    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(message).toContain('customer.example · /api/health');
    expect(message).toContain('HTTP 503');
    expect(message).not.toContain('https://customer.example/api/health');
  });

  it('includes an absolute Explorer URL in the webhook text', async () => {
    post.mockResolvedValueOnce({});
    await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'LOG_FINDING',
        sourceName: 'payment-service',
        title: 'Payment timeout',
        actionUrl: 'https://monitor.example/explorer',
      },
    });
    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(message).toContain('*Source:* payment-service');
    expect(message).toContain(
      '<https://monitor.example/explorer|View logs in dashboard>',
    );
  });

  it('ignores an external finding link', async () => {
    post.mockResolvedValueOnce({});
    await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'LOG_FINDING',
        actionUrl: 'https://customer.example/explorer',
      },
    });

    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(message).toContain(
      '<https://monitor.example/explorer|View logs in dashboard>',
    );
    expect(message).not.toContain('https://customer.example/explorer');
  });

  it('names the affected metric rule when an alert ends after an update', async () => {
    post.mockResolvedValueOnce({});
    await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        sourceId: 'rule-1',
        sourceName: 'User_server',
        assetId: 'asset-1',
        alertType: 'METRIC_THRESHOLD',
        metricType: 'CPU_USAGE',
        status: 'RESOLVED',
        resolutionReason: 'METRIC_RULE_UPDATED',
      },
    });
    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(message).toContain('🟢 Resolved · *CPU usage alert*');
    expect(message).toContain('*Source:* User_server');
    expect(message).toContain('Rule ID: rule-1');
    expect(message).toContain('rule was updated');
  });

  it('describes a stale health check that ended because its target was paused', async () => {
    post.mockResolvedValueOnce({});
    await new SlackNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'HEALTH_CHECK_STALE',
        status: 'RESOLVED',
        resolutionReason: 'HEALTH_CHECK_TARGET_PAUSED',
      },
    });
    const message = (post.mock.calls[0][1] as { text: string }).text;
    expect(message).toContain('🟢 Resolved · *Health check paused*');
    expect(message).not.toContain('Health check data resumed');
  });

  it('classifies HTTP 429 as transient and HTTP 400 as permanent', async () => {
    post.mockRejectedValueOnce(httpError(429));
    expect(
      await new SlackNotificationSender(config).sendAlert(input),
    ).toMatchObject({
      success: false,
      isTransientError: true,
    });
    post.mockRejectedValueOnce(httpError(400));
    expect(
      await new SlackNotificationSender(config).sendAlert(input),
    ).toMatchObject({
      success: false,
      isTransientError: false,
    });
  });
});

describe('WebhookNotificationSender adapter', () => {
  const config = {
    get: (key: string) =>
      key === 'DASHBOARD_PUBLIC_URL' ? 'https://monitor.example' : undefined,
  } as ConfigService;

  it('signs the exact JSON body sent over HTTP', async () => {
    post.mockResolvedValueOnce({});
    const result = await new WebhookNotificationSender(config).sendAlert({
      ...input,
      alert: { ...input.alert, sourceName: 'register-uasportal' },
    });

    expect(result.success).toBe(true);
    const [url, body, options] = post.mock.calls[0];
    expect(url).toBe('recipient');
    expect(typeof body).toBe('string');
    const expectedSignature = createHmac('sha256', 'shared-secret')
      .update(body as string)
      .digest('hex');
    expect(options?.headers).toMatchObject({
      'X-Signature-SHA256': `sha256=${expectedSignature}`,
    });
    expect(JSON.parse(body as string)).toMatchObject({
      alertId: 'alert-1',
      occurredAt: '2026-10-04T00:00:00.000Z',
      sourceName: 'register-uasportal',
      presentation: {
        headline: '🟠 Warning · Health check failed',
        sourceName: 'register-uasportal',
        severity: 'Warning',
        dashboardUrl: 'https://monitor.example/alerts/alert-1',
      },
    });
  });

  it('does not expose an external health URL as a presentation link', async () => {
    post.mockResolvedValueOnce({});
    await new WebhookNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        sourceName: 'https://customer.example/api/health',
        message:
          'Health check failed for https://customer.example/api/health: HTTP 503',
      },
    });
    const body = JSON.parse(post.mock.calls[0][1] as string) as {
      presentation: {
        sourceName: string;
        summary: string;
        dashboardUrl: string;
      };
    };
    expect(body.presentation.sourceName).toBe('customer.example · /api/health');
    expect(body.presentation.summary).toContain('HTTP 503');
    expect(body.presentation.summary).not.toContain(
      'https://customer.example/api/health',
    );
    expect(body.presentation.dashboardUrl).toBe(
      'https://monitor.example/alerts/alert-1',
    );
  });

  it('shows the affected rule when a metric alert ends after an update', async () => {
    post.mockResolvedValueOnce({});
    await new WebhookNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'METRIC_THRESHOLD',
        status: 'RESOLVED',
        metricType: 'CPU_USAGE',
        sourceName: 'User_server',
        sourceId: 'rule-1',
        resolutionReason: 'METRIC_RULE_UPDATED',
      },
    });
    const body = JSON.parse(post.mock.calls[0][1] as string) as {
      sourceId: string;
      presentation: {
        headline: string;
        sourceName: string;
        summary: string;
        reason: string;
      };
    };
    expect(body.sourceId).toBe('rule-1');
    expect(body.presentation).toMatchObject({
      headline: '🟢 Resolved · CPU usage alert',
      sourceName: 'User_server',
      reason: 'metric rule updated',
    });
    expect(body.presentation.summary).toContain('rule was updated');
  });

  it('falls back to the dashboard Explorer for a malformed finding link', async () => {
    post.mockResolvedValueOnce({});
    await new WebhookNotificationSender(config).sendAlert({
      ...input,
      alert: {
        ...input.alert,
        alertType: 'LOG_FINDING',
        sourceName: 'payment-service',
        actionUrl: 'not a valid URL',
      },
    });
    const body = JSON.parse(post.mock.calls[0][1] as string) as {
      presentation: { sourceName: string; dashboardUrl: string };
    };
    expect(body.presentation).toMatchObject({
      sourceName: 'payment-service',
      dashboardUrl: 'https://monitor.example/explorer',
    });
  });

  it('does not post without a signing secret', async () => {
    const result = await new WebhookNotificationSender(config).sendAlert({
      ...input,
      secretToken: null,
    });
    expect(result).toMatchObject({ success: false, isTransientError: false });
    expect(post).not.toHaveBeenCalled();
  });

  it('classifies HTTP 503 as transient', async () => {
    post.mockRejectedValueOnce(httpError(503));
    expect(
      await new WebhookNotificationSender(config).sendAlert(input),
    ).toMatchObject({
      success: false,
      isTransientError: true,
    });
  });
});

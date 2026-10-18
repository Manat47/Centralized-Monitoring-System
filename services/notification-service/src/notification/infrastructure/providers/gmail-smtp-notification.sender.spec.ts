import * as nodemailer from 'nodemailer';

import type { ConfigService } from '@nestjs/config';

import type { SendNotificationInput } from '../../domain/ports/notification-sender.port';
import { GmailSmtpNotificationSender } from './gmail-smtp-notification.sender';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('GmailSmtpNotificationSender', () => {
  const sendMail = jest
    .fn<Promise<void>, [{ subject: string; text: string; html: string }]>()
    .mockResolvedValue(undefined);
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          SMTP_USER: 'sender@example.com',
          SMTP_PASS: 'test-password',
          DASHBOARD_PUBLIC_URL: 'https://monitor.example',
        })[key],
    ),
  } as unknown as ConfigService;
  const input: SendNotificationInput = {
    recipientEmail: 'operator@example.com',
    alertId: 'alert-1',
    assetId: null,
    sourceId: 'target-1',
    sourceName: 'register-uasportal',
    severity: 'CRITICAL',
    status: 'TRIGGERED',
    alertType: 'ENDPOINT_UNAVAILABLE',
    metricType: 'HTTP',
    title: 'Health check failed',
    message:
      'Health check failed for https://customer.example/health: HTTP 503',
    occurredAt: new Date('2026-10-16T09:14:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('links regular alert emails to this dashboard', async () => {
    const sender = new GmailSmtpNotificationSender(config);

    await sender.send({
      ...input,
      actionUrl: 'https://customer.example/health',
    });

    const sent = sendMail.mock.calls[0][0];
    expect(sent.subject).toContain('register-uasportal');
    expect(sent.text).toContain('https://monitor.example/alerts/alert-1');
    expect(sent.html).toContain(
      'href="https://monitor.example/alerts/alert-1"',
    );
    expect(sent.html).not.toContain('href="https://customer.example/health"');
  });

  it('keeps a log finding on its valid Explorer link', async () => {
    const sender = new GmailSmtpNotificationSender(config);

    await sender.send({
      ...input,
      alertType: 'LOG_FINDING',
      sourceId: 'rule-1',
      sourceName: 'payment-service',
      actionUrl: 'https://monitor.example/explorer?projectId=project-1',
    });

    expect(sendMail.mock.calls[0][0].html).toContain(
      'href="https://monitor.example/explorer?projectId=project-1"',
    );
    expect(sendMail.mock.calls[0][0].html).not.toContain('/alerts/alert-1');
  });

  it('falls back to the dashboard Explorer when a finding has no deep link', async () => {
    const sender = new GmailSmtpNotificationSender(config);

    await sender.send({ ...input, alertType: 'LOG_FINDING' });

    expect(sendMail.mock.calls[0][0].html).toContain(
      'href="https://monitor.example/explorer"',
    );
  });
});

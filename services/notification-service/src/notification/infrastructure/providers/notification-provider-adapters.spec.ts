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
  it('posts a push message using the configured token', async () => {
    const config = { get: () => 'line-token' } as unknown as ConfigService;
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
  it('posts alert text to the incoming webhook', async () => {
    post.mockResolvedValueOnce({});
    const result = await new SlackNotificationSender().sendAlert(input);

    expect(result.success).toBe(true);
    expect(post).toHaveBeenCalledWith(
      'recipient',
      { text: '*Endpoint unavailable*\nConnection refused' },
      { timeout: 10000 },
    );
  });

  it('classifies HTTP 429 as transient and HTTP 400 as permanent', async () => {
    post.mockRejectedValueOnce(httpError(429));
    expect(await new SlackNotificationSender().sendAlert(input)).toMatchObject({
      success: false,
      isTransientError: true,
    });
    post.mockRejectedValueOnce(httpError(400));
    expect(await new SlackNotificationSender().sendAlert(input)).toMatchObject({
      success: false,
      isTransientError: false,
    });
  });
});

describe('WebhookNotificationSender adapter', () => {
  it('signs the exact JSON body sent over HTTP', async () => {
    post.mockResolvedValueOnce({});
    const result = await new WebhookNotificationSender().sendAlert(input);

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
    });
  });

  it('does not post without a signing secret', async () => {
    const result = await new WebhookNotificationSender().sendAlert({
      ...input,
      secretToken: null,
    });
    expect(result).toMatchObject({ success: false, isTransientError: false });
    expect(post).not.toHaveBeenCalled();
  });

  it('classifies HTTP 503 as transient', async () => {
    post.mockRejectedValueOnce(httpError(503));
    expect(
      await new WebhookNotificationSender().sendAlert(input),
    ).toMatchObject({
      success: false,
      isTransientError: true,
    });
  });
});

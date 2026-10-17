import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import type {
  NotificationSenderPort,
  SendChannelNotificationInput,
  SendResult,
} from '../../domain/ports/notification-sender.port';
import { alertChannelPresentation } from './alert-channel-presentation';
import { httpSendFailure } from './provider-send-result';

@Injectable()
export class WebhookNotificationSender implements NotificationSenderPort {
  readonly channel = 'webhook' as const;

  constructor(private readonly config: ConfigService) {}

  async sendAlert(input: SendChannelNotificationInput): Promise<SendResult> {
    if (!input.secretToken) {
      return {
        success: false,
        isTransientError: false,
        errorMessage: 'Webhook secret token is not configured',
      };
    }

    try {
      const content = alertChannelPresentation(
        input.alert,
        this.config.get<string>('DASHBOARD_PUBLIC_URL'),
      );
      const body = JSON.stringify({
        ...input.alert,
        occurredAt: input.alert.occurredAt.toISOString(),
        presentation: {
          headline: `${content.indicator} · ${content.eventLabel}`,
          sourceName: content.sourceName,
          severity: content.severityLabel,
          summary: content.details,
          ...(content.reason ? { reason: content.reason } : {}),
          ...(content.dashboardUrl
            ? { dashboardUrl: content.dashboardUrl }
            : {}),
        },
      });
      const signature = createHmac('sha256', input.secretToken)
        .update(body)
        .digest('hex');

      await axios.post(input.destination, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-SHA256': `sha256=${signature}`,
        },
        timeout: 10000,
        transformRequest: [(data: string) => data],
      });
      return { success: true, isTransientError: false };
    } catch (error: unknown) {
      return httpSendFailure(error);
    }
  }
}

import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import axios from 'axios';

import type {
  NotificationSenderPort,
  SendChannelNotificationInput,
  SendResult,
} from '../../domain/ports/notification-sender.port';
import { httpSendFailure } from './provider-send-result';

@Injectable()
export class WebhookNotificationSender implements NotificationSenderPort {
  readonly channel = 'webhook' as const;

  async sendAlert(input: SendChannelNotificationInput): Promise<SendResult> {
    if (!input.secretToken) {
      return {
        success: false,
        isTransientError: false,
        errorMessage: 'Webhook secret token is not configured',
      };
    }

    try {
      const body = JSON.stringify({
        ...input.alert,
        occurredAt: input.alert.occurredAt.toISOString(),
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

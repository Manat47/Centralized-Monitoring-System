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
export class LineNotificationSender implements NotificationSenderPort {
  readonly channel = 'line' as const;

  constructor(private readonly configService: ConfigService) {}

  async sendAlert(input: SendChannelNotificationInput): Promise<SendResult> {
    const token = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (!token) {
      return {
        success: false,
        isTransientError: false,
        errorMessage: 'LINE channel access token is not configured',
      };
    }

    try {
      await axios.post(
        'https://api.line.me/v2/bot/message/push',
        {
          to: input.destination,
          messages: [
            {
              type: 'text',
              text: this.messageText(input.alert),
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        },
      );
      return { success: true, isTransientError: false };
    } catch (error: unknown) {
      return httpSendFailure(error);
    }
  }

  private messageText(alert: SendChannelNotificationInput['alert']): string {
    const content = alertChannelPresentation(
      alert,
      this.configService.get<string>('DASHBOARD_PUBLIC_URL'),
    );
    return [
      `${content.indicator} · ${content.eventLabel}`,
      `Source: ${content.sourceName}`,
      `${alert.status === 'RESOLVED' ? 'Previous severity' : 'Severity'}: ${content.severityLabel}`,
      `Details: ${content.details.slice(0, 3000)}`,
      ...(content.reason ? [`Reason: ${content.reason}`] : []),
      `${content.referenceLabel}: ${alert.sourceId}`,
      `Alert ID: ${alert.alertId}`,
      ...(content.dashboardUrl
        ? [`${content.dashboardLabel}: ${content.dashboardUrl}`]
        : []),
    ]
      .join('\n')
      .slice(0, 5000);
  }
}

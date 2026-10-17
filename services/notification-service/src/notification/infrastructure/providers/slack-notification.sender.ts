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
export class SlackNotificationSender implements NotificationSenderPort {
  readonly channel = 'slack' as const;

  constructor(private readonly config: ConfigService) {}

  async sendAlert(input: SendChannelNotificationInput): Promise<SendResult> {
    try {
      await axios.post(
        input.destination,
        { text: this.messageText(input.alert) },
        { timeout: 10000 },
      );
      return { success: true, isTransientError: false };
    } catch (error: unknown) {
      return httpSendFailure(error);
    }
  }

  private messageText(alert: SendChannelNotificationInput['alert']): string {
    const content = alertChannelPresentation(
      alert,
      this.config.get<string>('DASHBOARD_PUBLIC_URL'),
    );
    return [
      `${content.indicator} · *${this.escape(content.eventLabel)}*`,
      `*Source:* ${this.escape(content.sourceName)}`,
      `*${alert.status === 'RESOLVED' ? 'Previous severity' : 'Severity'}:* ${content.severityLabel}`,
      `*Details:* ${this.escape(content.details)}`,
      ...(content.reason ? [`*Reason:* ${this.escape(content.reason)}`] : []),
      `${content.referenceLabel}: ${alert.sourceId} · Alert ID: ${alert.alertId}`,
      ...(content.dashboardUrl
        ? [`<${this.escape(content.dashboardUrl)}|${content.dashboardLabel}>`]
        : []),
    ].join('\n');
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import type {
  NotificationSenderPort,
  SendChannelNotificationInput,
  SendResult,
} from '../../domain/ports/notification-sender.port';
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
              text: `${input.alert.title}\n${input.alert.message}`.slice(
                0,
                5000,
              ),
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
}

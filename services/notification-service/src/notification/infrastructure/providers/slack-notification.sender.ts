import { Injectable } from '@nestjs/common';
import axios from 'axios';

import type {
  NotificationSenderPort,
  SendChannelNotificationInput,
  SendResult,
} from '../../domain/ports/notification-sender.port';
import { httpSendFailure } from './provider-send-result';

@Injectable()
export class SlackNotificationSender implements NotificationSenderPort {
  readonly channel = 'slack' as const;

  async sendAlert(input: SendChannelNotificationInput): Promise<SendResult> {
    try {
      await axios.post(
        input.destination,
        { text: `*${input.alert.title}*\n${input.alert.message}` },
        { timeout: 10000 },
      );
      return { success: true, isTransientError: false };
    } catch (error: unknown) {
      return httpSendFailure(error);
    }
  }
}

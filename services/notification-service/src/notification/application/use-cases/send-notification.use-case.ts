import { Inject, Injectable } from '@nestjs/common';

import type { NotificationEvent } from '../contracts/notification-event.contract';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../domain/ports/notification-sender.port';

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
  ) {}

  async execute(event: NotificationEvent): Promise<void> {
    const title =
      event.eventType === 'ALERT_TRIGGERED'
        ? `${event.severity} alert triggered`
        : `${event.severity} alert resolved`;

    await this.notificationSender.send({
      alertId: event.alertId,
      assetId: event.assetId,
      severity: event.severity,
      title,
      message: event.message,
      occurredAt: new Date(event.occurredAt),
    });
  }
}

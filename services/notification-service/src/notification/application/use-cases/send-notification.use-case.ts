import { Inject, Injectable, Logger } from '@nestjs/common';

import type { NotificationEvent } from '../contracts/notification-event.contract';

import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../domain/ports/notification-sender.port';

import {
  NOTIFICATION_RECIPIENT_REPOSITORY,
  type NotificationRecipientRepository,
} from '../../domain/ports/notification-recipient.repository';

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,

    @Inject(NOTIFICATION_RECIPIENT_REPOSITORY)
    private readonly notificationRecipientRepository: NotificationRecipientRepository,
  ) {}

  async execute(event: NotificationEvent): Promise<void> {
    const title =
      event.eventType === 'ALERT_TRIGGERED'
        ? `${event.severity} alert triggered`
        : `${event.severity} alert resolved`;

    const recipients = await this.notificationRecipientRepository.findAll();

    if (recipients.length === 0) {
      this.logger.warn(
        `No notification recipients configured for alert ${event.alertId}`,
      );

      return;
    }

    let successCount = 0;
    let lastError: unknown = null;

    for (const recipient of recipients) {
      try {
        await this.notificationSender.send({
          recipientEmail: recipient.email,
          alertId: event.alertId,
          assetId: event.assetId,
          severity: event.severity,
          title,
          message: event.message,
          occurredAt: new Date(event.occurredAt),
        });

        successCount++;
      } catch (error) {
        lastError = error;

        this.logger.error(
          `Failed to send notification to ${recipient.email}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (successCount === 0 && lastError) {
      throw lastError;
    }
  }
}

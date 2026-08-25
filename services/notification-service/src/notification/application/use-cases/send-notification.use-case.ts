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
    let title: string;

    if (event.eventType === 'ALERT_TRIGGERED') {
      title = `${event.severity} alert triggered`;
    } else if (event.resolutionReason === 'ASSET_DEACTIVATED') {
      title = `${event.severity} alert ended — asset deactivated`;
    } else if (event.resolutionReason === 'METRIC_RULE_UPDATED') {
      title = `${event.severity} alert ended — metric rule updated`;
    } else if (event.resolutionReason === 'METRIC_RULE_DISABLED') {
      title = `${event.severity} alert ended — metric rule disabled`;
    } else if (event.resolutionReason === 'METRIC_RULE_ARCHIVED') {
      title = `${event.severity} alert ended — metric rule archived`;
    } else {
      title = `${event.severity} alert resolved`;
    }

    const recipients = await this.notificationRecipientRepository.findAll();

    if (recipients.length === 0) {
      this.logger.warn(
        `No notification recipients configured for alert ${event.alertId}`,
      );

      return;
    }

    let successCount = 0;
    let lastError: Error | null = null;

    for (const recipient of recipients) {
      try {
        await this.notificationSender.send({
          recipientEmail: recipient.email,
          alertId: event.alertId,
          assetId: event.assetId,
          severity: event.severity,
          status:
            event.eventType === 'ALERT_TRIGGERED' ? 'TRIGGERED' : 'RESOLVED',
          alertType: event.alertType,
          metricType: event.metricType,
          resolutionReason:
            event.eventType === 'ALERT_RESOLVED'
              ? event.resolutionReason
              : undefined,
          title,
          message: event.message,
          occurredAt: new Date(event.occurredAt),
        });

        successCount++;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.error(
          `Failed to send notification to ${recipient.email}`,
          lastError.stack,
        );
      }
    }

    if (successCount === 0 && lastError) {
      throw lastError;
    }
  }
}

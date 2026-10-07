import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_ROUTING_REPOSITORY,
  type NotificationRoutingRepository,
  type RoutingRecipient,
} from '../../domain/ports/notification-routing.repository';
import {
  NOTIFICATION_CHANNEL_SENDERS,
  type NotificationSenderPort,
  type SendChannelNotificationInput,
  type SendResult,
} from '../../domain/ports/notification-sender.port';

export interface DeliveryAttempt {
  recipient: RoutingRecipient;
  result: SendResult;
  attempts: number;
}

export interface NotificationExecutionReport {
  mode: 'broadcast' | 'fallback';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  deliveries: DeliveryAttempt[];
}

type Alert = SendChannelNotificationInput['alert'];

@Injectable()
export class NotificationExecutionRouter {
  constructor(
    @Inject(NOTIFICATION_ROUTING_REPOSITORY)
    private readonly routingRepository: NotificationRoutingRepository,
    @Inject(NOTIFICATION_CHANNEL_SENDERS)
    private readonly senders: NotificationSenderPort[],
  ) {}

  async execute(alert: Alert): Promise<NotificationExecutionReport> {
    const { isFallbackEnabled, recipients } =
      await this.routingRepository.getConfiguration();

    if (!isFallbackEnabled) {
      const settled = await Promise.allSettled(
        recipients.map((recipient) => this.sendOnce(recipient, alert)),
      );
      const deliveries = settled.map((outcome, index) =>
        outcome.status === 'fulfilled'
          ? outcome.value
          : {
              recipient: recipients[index],
              result: this.unexpectedFailure(),
              attempts: 1,
            },
      );
      return this.report('broadcast', recipients.length, deliveries);
    }

    const deliveries: DeliveryAttempt[] = [];
    const orderedRecipients = [...recipients].sort(
      (left, right) =>
        (left.priority ?? Number.POSITIVE_INFINITY) -
          (right.priority ?? Number.POSITIVE_INFINITY) ||
        left.recipientId.localeCompare(right.recipientId),
    );
    for (let index = 0; index < orderedRecipients.length;) {
      const priority = orderedRecipients[index].priority;
      let levelSucceeded = false;
      do {
        const delivery = await this.sendWithRetry(
          orderedRecipients[index],
          alert,
        );
        deliveries.push(delivery);
        levelSucceeded ||= delivery.result.success;
        index += 1;
      } while (
        index < orderedRecipients.length &&
        orderedRecipients[index].priority === priority
      );
      if (levelSucceeded) break;
    }
    return this.report('fallback', recipients.length, deliveries);
  }

  private async sendWithRetry(
    recipient: RoutingRecipient,
    alert: Alert,
  ): Promise<DeliveryAttempt> {
    let delivery = await this.sendOnce(recipient, alert);
    for (
      let retry = 1;
      retry <= 2 &&
      !delivery.result.success &&
      delivery.result.isTransientError;
      retry++
    ) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 500 * 2 ** (retry - 1)),
      );
      delivery = await this.sendOnce(recipient, alert);
      delivery.attempts = retry + 1;
    }
    return delivery;
  }

  private async sendOnce(
    recipient: RoutingRecipient,
    alert: Alert,
  ): Promise<DeliveryAttempt> {
    const sender = this.senders.find(
      (candidate) => candidate.channel === recipient.channel,
    );
    if (!sender) {
      return {
        recipient,
        result: {
          success: false,
          isTransientError: false,
          errorMessage: `No sender configured for ${recipient.channel}`,
        },
        attempts: 1,
      };
    }

    try {
      const result = await sender.sendAlert({
        destination: recipient.destination,
        secretToken: recipient.secretToken,
        alert,
      });
      return { recipient, result, attempts: 1 };
    } catch {
      return { recipient, result: this.unexpectedFailure(), attempts: 1 };
    }
  }

  private unexpectedFailure(): SendResult {
    return {
      success: false,
      isTransientError: true,
      errorMessage: 'Unexpected provider failure',
    };
  }

  private report(
    mode: NotificationExecutionReport['mode'],
    recipientCount: number,
    deliveries: DeliveryAttempt[],
  ): NotificationExecutionReport {
    const sentCount = deliveries.filter(
      (delivery) => delivery.result.success,
    ).length;
    return {
      mode,
      recipientCount,
      sentCount,
      failedCount: deliveries.length - sentCount,
      deliveries,
    };
  }
}

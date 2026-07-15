import { Injectable, Logger } from '@nestjs/common';

import type {
  NotificationSender,
  SendNotificationInput,
} from '../../domain/ports/notification-sender.port';

@Injectable()
export class ConsoleNotificationSender implements NotificationSender {
  private readonly logger = new Logger(ConsoleNotificationSender.name);

  send(input: SendNotificationInput): Promise<void> {
    this.logger.log({
      alertId: input.alertId,
      assetId: input.assetId,
      severity: input.severity,
      title: input.title,
      message: input.message,
      occurredAt: input.occurredAt.toISOString(),
    });

    return Promise.resolve();
  }
}

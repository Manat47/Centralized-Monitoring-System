import { Injectable, Logger } from '@nestjs/common';

import type {
  AlertEvent,
  AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

@Injectable()
export class ConsoleAlertEventPublisher implements AlertEventPublisher {
  private readonly logger = new Logger(ConsoleAlertEventPublisher.name);

  publish(event: AlertEvent): Promise<void> {
    this.logger.warn(
      JSON.stringify({
        eventType: event.eventType,
        ruleId: event.ruleId,
        assetId: event.assetId,
        metricType: event.metricType,
        severity: event.severity,
        thresholdValue: event.thresholdValue,
        actualValue: event.actualValue,
        occurredAt: event.occurredAt,
        message: event.message,
      }),
    );

    return Promise.resolve();
  }
}

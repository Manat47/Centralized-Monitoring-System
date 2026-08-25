import { Injectable, Logger } from '@nestjs/common';

import type {
  AlertEvent,
  AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

@Injectable()
export class ConsoleAlertEventPublisher implements AlertEventPublisher {
  private readonly logger = new Logger(ConsoleAlertEventPublisher.name);

  publish(event: AlertEvent): Promise<void> {
    this.logger.warn(JSON.stringify(event));

    return Promise.resolve();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  type AlertEvent,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';
import {
  ALERT_EVENTS_CLIENT,
  ALERT_EVENT_PATTERN,
} from '../messaging/rabbitmq.constants';

@Injectable()
export class RabbitMqAlertEventPublisher implements AlertEventPublisher {
  constructor(
    @Inject(ALERT_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: AlertEvent): Promise<void> {
    await lastValueFrom(this.client.emit(ALERT_EVENT_PATTERN, event));
  }
}

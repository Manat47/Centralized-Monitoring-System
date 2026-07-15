import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  type NotificationEvent,
  type NotificationEventPublisher,
} from '../../domain/ports/notification-event-publisher.port';

export const NOTIFICATION_EVENTS_CLIENT = Symbol('NOTIFICATION_EVENTS_CLIENT');

export const NOTIFICATION_EVENT_PATTERN = 'notification.alert.changed';

@Injectable()
export class RabbitMqNotificationEventPublisher implements NotificationEventPublisher {
  constructor(
    @Inject(NOTIFICATION_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: NotificationEvent): Promise<void> {
    await lastValueFrom(this.client.emit(NOTIFICATION_EVENT_PATTERN, event));
  }
}

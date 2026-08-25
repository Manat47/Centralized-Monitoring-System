import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  type InvitationEvent,
  type InvitationEventPublisher,
} from '../../domain/ports/invitation-event-publisher.port';
import {
  NOTIFICATION_EVENTS_CLIENT,
  USER_INVITATION_EVENT_PATTERN,
} from '../messaging/rabbitmq.constants';

@Injectable()
export class RabbitMqInvitationEventPublisher implements InvitationEventPublisher {
  constructor(
    @Inject(NOTIFICATION_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: InvitationEvent): Promise<void> {
    await lastValueFrom(this.client.emit(USER_INVITATION_EVENT_PATTERN, event));
  }
}

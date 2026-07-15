import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';

import type { NotificationEvent } from '../../application/contracts/notification-event.contract';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';

export const NOTIFICATION_EVENT_PATTERN = 'notification.alert.changed';

@Controller()
export class NotificationEventConsumer {
  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  @EventPattern(NOTIFICATION_EVENT_PATTERN)
  async handle(
    @Payload() event: NotificationEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    await this.sendNotificationUseCase.execute(event);

    channel.ack(message);
  }
}

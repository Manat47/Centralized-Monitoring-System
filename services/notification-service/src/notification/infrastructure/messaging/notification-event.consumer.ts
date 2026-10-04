import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';

import type { NotificationEvent } from '../../application/contracts/notification-event.contract';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';
import type { UserInvitationEvent } from '../../application/contracts/user-invitation-event.contract';
import { SendUserInvitationUseCase } from '../../application/use-cases/send-user-invitation.use-case';

export const NOTIFICATION_EVENT_PATTERN = 'notification.alert.changed';
export const USER_INVITATION_EVENT_PATTERN = 'notification.user.invited';
export const NOTIFICATION_DEAD_LETTER_QUEUE =
  process.env.RABBITMQ_NOTIFICATION_DLQ ?? 'notification_events_dead_letter';

@Controller()
export class NotificationEventConsumer {
  private readonly logger = new Logger(NotificationEventConsumer.name);

  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    private readonly sendUserInvitationUseCase: SendUserInvitationUseCase,
  ) {}

  @EventPattern(NOTIFICATION_EVENT_PATTERN)
  async handle(
    @Payload() event: NotificationEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as ConfirmChannel;
    const message = context.getMessage() as ConsumeMessage;

    const result = await this.sendNotificationUseCase.execute(event);

    if (result.sentCount === 0) {
      await channel.assertQueue(NOTIFICATION_DEAD_LETTER_QUEUE, {
        durable: true,
      });
      channel.sendToQueue(NOTIFICATION_DEAD_LETTER_QUEUE, message.content, {
        persistent: true,
        headers: {
          'x-notification-failure': 'ALL_CHANNELS_FAILED',
        },
      });
      await channel.waitForConfirms();
      this.logger.error(
        `All notification channels failed for alert ${event.alertId}; sent to ${NOTIFICATION_DEAD_LETTER_QUEUE}`,
      );
    }

    channel.ack(message);
  }

  @EventPattern(USER_INVITATION_EVENT_PATTERN)
  async handleUserInvitation(
    @Payload() event: UserInvitationEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    await this.sendUserInvitationUseCase.execute(event);

    channel.ack(message);
  }
}

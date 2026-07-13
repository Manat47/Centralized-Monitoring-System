import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import type { AlertEvent } from '../../application/contracts/alert-event';
import { ProcessAlertEventUseCase } from '../../application/use-cases/process-alert-event.use-case';
import { ALERT_EVENT_PATTERN } from './rabbitmq.constants';
import type { Channel, ConsumeMessage } from 'amqplib';

@Controller()
export class AlertEventConsumer {
  constructor(
    private readonly processAlertEventUseCase: ProcessAlertEventUseCase,
  ) {}

  @EventPattern(ALERT_EVENT_PATTERN)
  async handleAlertEvent(
    @Payload() event: AlertEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    await this.processAlertEventUseCase.execute(event);

    const channel = context.getChannelRef() as Channel;

    const message = context.getMessage() as ConsumeMessage;

    channel.ack(message);
  }
}

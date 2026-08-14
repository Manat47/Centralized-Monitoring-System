import { Controller } from '@nestjs/common';
import type { Channel, ConsumeMessage } from 'amqplib';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { RecordAuditLogUseCase } from '../../application/use-cases/record-audit-log.use-case';
import type { AuditEvent } from './contracts/audit-event.contract';

@Controller()
export class AuditEventConsumer {
  constructor(private readonly recordAuditLogUseCase: RecordAuditLogUseCase) {}

  @EventPattern('audit.event')
  async handleAuditEvent(
    @Payload() event: AuditEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    console.log('[AuditConsumer] received:', event);

    await this.recordAuditLogUseCase.execute({
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      result: event.result,
      occurredAt: new Date(event.occurredAt),
    });
    console.log('[AuditConsumer] saved');

    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    channel.ack(message);
  }
}

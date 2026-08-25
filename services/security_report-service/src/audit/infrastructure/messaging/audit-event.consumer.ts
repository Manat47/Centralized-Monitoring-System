import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Channel, ConsumeMessage } from 'amqplib';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

import { RecordAuditLogUseCase } from '../../application/use-cases/record-audit-log.use-case';
import { AuditEventDto } from './contracts/audit-event.contract';

@Controller()
export class AuditEventConsumer {
  constructor(private readonly recordAuditLogUseCase: RecordAuditLogUseCase) {}

  @EventPattern('audit.event')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async handleAuditEvent(
    @Payload() event: AuditEventDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    console.log('[AuditConsumer] received:', event);

    await this.recordAuditLogUseCase.execute({
      eventId: event.eventId,
      schemaVersion: event.schemaVersion,
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      actorEmail: event.actorEmail,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      resourceName: event.resourceName,
      result: event.result,
      sourceService: event.sourceService,
      requestId: event.requestId,
      metadata: event.metadata,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
      occurredAt: new Date(event.occurredAt),
    });
    console.log('[AuditConsumer] saved');

    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as ConsumeMessage;

    channel.ack(message);
  }
}

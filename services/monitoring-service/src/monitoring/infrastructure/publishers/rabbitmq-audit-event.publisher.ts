import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  type AuditEvent,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

import {
  AUDIT_EVENTS_CLIENT,
  AUDIT_EVENT_PATTERN,
} from '../messaging/rabbitmq.constants';

@Injectable()
export class RabbitMqAuditEventPublisher implements AuditEventPublisher {
  constructor(
    @Inject(AUDIT_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: AuditEvent): Promise<void> {
    console.log('[AuditPublisher] publishing:', event);

    await lastValueFrom(
      this.client.emit(AUDIT_EVENT_PATTERN, {
        ...event,
        eventId: randomUUID(),
        schemaVersion: 1,
        sourceService: 'monitoring-service',
      }),
    );
  }
}
import { randomUUID } from 'node:crypto';

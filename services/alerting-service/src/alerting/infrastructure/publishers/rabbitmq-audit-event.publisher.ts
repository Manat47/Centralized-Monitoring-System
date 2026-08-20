import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  type AuditEvent,
  type AuditEventPublisher,
} from '../../domain/port/audit-event-publisher.port';

export const AUDIT_EVENTS_CLIENT = 'AUDIT_EVENTS_CLIENT';
export const AUDIT_EVENT_PATTERN = 'audit.event';

@Injectable()
export class RabbitMqAuditEventPublisher implements AuditEventPublisher {
  constructor(
    @Inject(AUDIT_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async publish(event: AuditEvent): Promise<void> {
    console.log('[AuditPublisher] publishing:', event);

    await lastValueFrom(this.client.emit(AUDIT_EVENT_PATTERN, event));
  }
}

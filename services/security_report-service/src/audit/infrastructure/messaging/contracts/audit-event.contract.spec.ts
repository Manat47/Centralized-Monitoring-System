import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AuditEventDto } from './audit-event.contract';

const validEvent = {
  eventId: 'f2179655-6493-4b12-b8b8-43fe13b84b32',
  schemaVersion: 1,
  actorUserId: 'cd09ba85-085d-4a77-b0ac-3b4afac11f4f',
  actorRole: 'ADMIN',
  actorEmail: 'admin@example.com',
  action: 'HEALTH_CHECK_TARGET_CHECKED',
  resourceType: 'HEALTH_CHECK_TARGET',
  resourceId: '57f86819-8102-430e-80b2-92a874629fd0',
  resourceName: 'Checkout health check',
  result: 'SUCCESS',
  sourceService: 'monitoring-service',
  metadata: { statusCode: 200 },
  occurredAt: '2026-08-24T12:00:00.000Z',
};

describe('AuditEventDto', () => {
  it('accepts a supported health check audit event', async () => {
    const errors = await validate(plainToInstance(AuditEventDto, validEvent));

    expect(errors).toHaveLength(0);
  });

  it('rejects an event without an idempotency key', async () => {
    const { eventId: _eventId, ...event } = validEvent;
    const errors = await validate(plainToInstance(AuditEventDto, event));

    expect(errors.some((error) => error.property === 'eventId')).toBe(true);
  });

  it('rejects an unsupported action', async () => {
    const errors = await validate(
      plainToInstance(AuditEventDto, {
        ...validEvent,
        action: 'HEALTH_CHECK_RESULT_RECORDED',
      }),
    );

    expect(errors.some((error) => error.property === 'action')).toBe(true);
  });
});

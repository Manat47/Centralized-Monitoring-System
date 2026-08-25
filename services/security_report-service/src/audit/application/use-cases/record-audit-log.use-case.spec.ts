import type { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import { RecordAuditLogUseCase } from './record-audit-log.use-case';

describe('RecordAuditLogUseCase', () => {
  it('preserves the event envelope and investigation context', async () => {
    const repository: jest.Mocked<AuditLogRepository> = {
      create: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn(),
      findForReport: jest.fn(),
    };
    const useCase = new RecordAuditLogUseCase(repository);
    const occurredAt = new Date('2026-08-24T12:00:00.000Z');

    await useCase.execute({
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
      occurredAt,
    });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][0].toObject()).toMatchObject({
      eventId: 'f2179655-6493-4b12-b8b8-43fe13b84b32',
      actorEmail: 'admin@example.com',
      resourceName: 'Checkout health check',
      sourceService: 'monitoring-service',
      metadata: { statusCode: 200 },
      occurredAt,
    });
  });
});

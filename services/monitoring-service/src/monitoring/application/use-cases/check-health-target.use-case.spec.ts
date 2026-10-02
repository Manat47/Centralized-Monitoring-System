import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';
import type { HealthCheckTargetRepository } from '../../domain/repositories/health-check-target.repository';
import type { HealthChecker } from '../../domain/ports/health-checker.port';
import type { HealthCheckStorage } from '../../domain/ports/health-check-storage.port';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { AlertEventPublisher } from '../../domain/ports/alert-event-publisher.port';
import { CheckHealthTargetUseCase } from './check-health-target.use-case';

describe('CheckHealthTargetUseCase', () => {
  let target: HealthCheckTarget;
  const repository = {
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<HealthCheckTargetRepository>;
  const checker = { check: jest.fn() } as unknown as jest.Mocked<HealthChecker>;
  const storage = {
    writeResult: jest.fn(),
  } as unknown as jest.Mocked<HealthCheckStorage>;
  const assetReader = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AssetReader>;
  const auditPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AuditEventPublisher>;
  const alertPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AlertEventPublisher>;
  const useCase = new CheckHealthTargetUseCase(
    repository,
    checker,
    storage,
    assetReader,
    auditPublisher,
    alertPublisher,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    target = HealthCheckTarget.create('target-1', {
      assetId: 'asset-1',
      url: 'https://example.com/health',
    });
    repository.findById.mockImplementation(() => Promise.resolve(target));
    repository.update.mockImplementation((updated) => Promise.resolve(updated));
    storage.writeResult.mockResolvedValue(undefined);
    checker.check.mockResolvedValue({
      statusCode: 200,
      responseTimeMs: 42,
      checkedAt: new Date('2026-10-01T00:00:00.000Z'),
      error: null,
    });
  });

  it('checks and stores a standalone target without asset lookup or alert event', async () => {
    target = HealthCheckTarget.create('target-1', {
      url: 'https://example.com/health',
    });
    await useCase.execute('target-1');

    expect(checker.check.mock.calls[0]).toEqual(['https://example.com/health']);
    expect(storage.writeResult.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        healthCheckTargetId: 'target-1',
        assetId: null,
      }),
    );
    expect(repository.update.mock.calls).toHaveLength(1);
    expect(assetReader.findById.mock.calls).toHaveLength(0);
    expect(alertPublisher.publish.mock.calls).toHaveLength(0);
  });

  it('publishes one failure after three failed checks and one recovery after success', async () => {
    assetReader.findById.mockResolvedValue({
      assetId: 'asset-1',
      status: 'ACTIVATE',
      assetType: 'APPLICATION',
    } as Awaited<ReturnType<AssetReader['findById']>>);
    const times = [0, 30, 60, 90, 120].map(
      (seconds) => new Date(Date.UTC(2026, 9, 1, 0, 0, seconds)),
    );
    for (let index = 0; index < times.length; index += 1) {
      checker.check.mockResolvedValueOnce({
        statusCode: index < 4 ? 500 : 200,
        responseTimeMs: 42,
        checkedAt: times[index],
        error: null,
      });
      await useCase.execute('target-1');
    }
    expect(
      alertPublisher.publish.mock.calls.map(([event]) => event.eventType),
    ).toEqual([
      'HEALTH_CHECK_RESULT_RECORDED',
      'HEALTH_CHECK_FAILED',
      'HEALTH_CHECK_RECOVERED',
    ]);
    expect(target.toObject()).toMatchObject({
      consecutiveFailures: 0,
      alertActive: false,
    });
  });
});

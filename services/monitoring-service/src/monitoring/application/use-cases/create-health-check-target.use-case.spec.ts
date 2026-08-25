import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type {
  AssetReader,
  AssetSnapshot,
} from '../../domain/ports/asset-reader.port';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { AlertEventPublisher } from '../../domain/ports/alert-event-publisher.port';
import type { HealthCheckTargetRepository } from '../../domain/repositories/health-check-target.repository';
import { CreateHealthCheckTargetUseCase } from './create-health-check-target.use-case';

const application: AssetSnapshot = {
  assetId: 'asset-1',
  assetType: 'APPLICATION',
  ipAddress: null,
  hostname: null,
  endpoint: 'https://example.com',
  status: 'ACTIVATE',
};

describe('CreateHealthCheckTargetUseCase', () => {
  const repository = {
    findActiveByAssetIdAndUrl: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<HealthCheckTargetRepository>;
  const assetReader = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AssetReader>;
  const auditPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AuditEventPublisher>;
  const alertEventPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AlertEventPublisher>;
  const useCase = new CreateHealthCheckTargetUseCase(
    repository,
    assetReader,
    auditPublisher,
    alertEventPublisher,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    assetReader.findById.mockResolvedValue(application);
    repository.findActiveByAssetIdAndUrl.mockResolvedValue(null);
    repository.create.mockImplementation((target) => Promise.resolve(target));
    auditPublisher.publish.mockResolvedValue(undefined);
    alertEventPublisher.publish.mockResolvedValue(undefined);
  });

  it('creates a running application check using the normalized URL', async () => {
    const target = await useCase.execute({
      assetId: application.assetId,
      url: 'HTTPS://EXAMPLE.COM:443/health#status',
      checkIntervalSeconds: 30,
      actorUserId: 'user-1',
      actorRole: 'ADMIN',
    });

    expect(repository.findActiveByAssetIdAndUrl.mock.calls[0]).toEqual([
      application.assetId,
      'https://example.com/health',
    ]);
    expect(target.toObject()).toMatchObject({
      assetId: application.assetId,
      url: 'https://example.com/health',
      checkIntervalSeconds: 30,
      enabled: true,
    });
    expect(alertEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED',
        state: 'RUNNING',
      }),
    );
  });

  it('rejects non-application assets', async () => {
    assetReader.findById.mockResolvedValue({
      ...application,
      assetType: 'SERVER',
      ipAddress: '10.0.0.1',
    });

    await expect(
      useCase.execute({
        assetId: application.assetId,
        url: 'https://example.com/health',
        actorUserId: 'user-1',
        actorRole: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate active application URL', async () => {
    repository.findActiveByAssetIdAndUrl.mockResolvedValue({} as never);

    await expect(
      useCase.execute({
        assetId: application.assetId,
        url: 'https://example.com/health',
        actorUserId: 'user-1',
        actorRole: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

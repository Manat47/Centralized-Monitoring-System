import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Asset } from '../../domain/entities/asset.entity';
import type { AssetLifecycleEventPublisher } from '../../domain/ports/asset-lifecycle-event-publisher.port';
import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { AssetRepository } from '../../domain/repositories/asset.repository';
import { DeactivateAssetUseCase } from './deactivate-asset.use-case';

describe('DeactivateAssetUseCase', () => {
  const asset = Asset.restore({
    assetId: '85ffffba-fdf7-464e-aad5-1b4a3b82110a',
    name: 'server-01',
    hostname: 'server-01.local',
    targetType: 'SERVER',
    ipAddress: '10.0.0.1',
    endpoint: null,
    environment: 'PRODUCTION',
    status: 'ACTIVATE',
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
  });
  const repository = {
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<AssetRepository>;
  const auditPublisher = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<AuditEventPublisher>;
  const publishLifecycleEvent =
    jest.fn<AssetLifecycleEventPublisher['publish']>();
  const lifecyclePublisher = {
    publish: publishLifecycleEvent,
  } as jest.Mocked<AssetLifecycleEventPublisher>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(asset);
    repository.update.mockImplementation((value) => Promise.resolve(value));
    auditPublisher.publish.mockResolvedValue(undefined);
    publishLifecycleEvent.mockResolvedValue(undefined);
  });

  it('publishes the terminal lifecycle event after deactivation', async () => {
    const useCase = new DeactivateAssetUseCase(
      repository,
      auditPublisher,
      lifecyclePublisher,
    );

    await useCase.execute(asset.toObject().assetId, {
      actorUserId: 'user-1',
      actorRole: 'ADMIN',
    });

    expect(publishLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ASSET_DEACTIVATED',
        assetId: asset.toObject().assetId,
      }),
    );
  });
});

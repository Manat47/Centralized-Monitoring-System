import { BadRequestException } from '@nestjs/common';

import type { AuditEventPublisher } from '../../domain/ports/audit-event-publisher.port';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { CreateMonitoringTargetUseCase } from './create-monitoring-target.use-case';

describe('CreateMonitoringTargetUseCase address source', () => {
  const asset = {
    assetId: '85ffffba-fdf7-464e-aad5-1b4a3b82110a',
    name: 'server-01',
    assetType: 'SERVER' as const,
    ipAddress: '192.168.1.10',
    hostname: 'server-01.local',
    endpoint: null,
    status: 'ACTIVATE' as const,
  };

  function setup(currentAsset = asset) {
    const repository = {
      findByAssetIdAndMonitoringType: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((target) => Promise.resolve(target)),
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const assetReader = {
      findById: jest.fn().mockResolvedValue(currentAsset),
    } as jest.Mocked<AssetReader>;
    const auditPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<AuditEventPublisher>;

    return {
      useCase: new CreateMonitoringTargetUseCase(
        repository,
        assetReader,
        auditPublisher,
      ),
      auditPublisher,
    };
  }

  const actor = {
    actorUserId: 'user-001',
    actorRole: 'ADMIN' as const,
  };

  it('requires an explicit source when hostname and IP are both configured', async () => {
    await expect(
      setup().useCase.execute({ assetId: asset.assetId, ...actor }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists the selected IP source', async () => {
    const { useCase, auditPublisher } = setup();

    const target = await useCase.execute({
      assetId: asset.assetId,
      addressSource: 'IP_ADDRESS',
      ...actor,
    });

    expect(target.toObject().addressSource).toBe('IP_ADDRESS');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(auditPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ addressSource: 'IP_ADDRESS' }),
      }),
    );
  });

  it('selects the only available source automatically', async () => {
    const { useCase } = setup({ ...asset, hostname: null });

    const target = await useCase.execute({ assetId: asset.assetId, ...actor });

    expect(target.toObject().addressSource).toBe('IP_ADDRESS');
  });
});

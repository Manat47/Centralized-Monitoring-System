import { BadRequestException } from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import { MonitoringEndpointResolver } from './monitoring-endpoint-resolver.service';

describe('MonitoringEndpointResolver', () => {
  const asset = {
    assetId: 'asset-001',
    name: 'server-01',
    assetType: 'SERVER' as const,
    ipAddress: '192.168.1.10',
    hostname: 'server-01.local',
    endpoint: null,
    status: 'ACTIVATE' as const,
  };

  function createResolver(currentAsset = asset) {
    const assetReader = {
      findById: jest.fn().mockResolvedValue(currentAsset),
    } as jest.Mocked<AssetReader>;

    return new MonitoringEndpointResolver(assetReader);
  }

  it('uses the selected hostname without falling back to the IP address', async () => {
    const target = MonitoringTarget.create('target-001', {
      assetId: asset.assetId,
      monitoringType: 'NODE_EXPORTER',
      addressSource: 'HOSTNAME',
    });

    await expect(createResolver().resolve(target)).resolves.toBe(
      'http://server-01.local:9100/metrics',
    );
  });

  it('uses the current IP address after the asset IP changes', async () => {
    const target = MonitoringTarget.create('target-002', {
      assetId: asset.assetId,
      monitoringType: 'NODE_EXPORTER',
      addressSource: 'IP_ADDRESS',
    });
    const changedAsset = { ...asset, ipAddress: '192.168.1.137' };

    await expect(createResolver(changedAsset).resolve(target)).resolves.toBe(
      'http://192.168.1.137:9100/metrics',
    );
  });

  it('reports a missing selected hostname instead of silently using the IP', async () => {
    const target = MonitoringTarget.create('target-003', {
      assetId: asset.assetId,
      monitoringType: 'NODE_EXPORTER',
      addressSource: 'HOSTNAME',
    });
    const withoutHostname = { ...asset, hostname: null };

    await expect(
      createResolver(withoutHostname).resolve(target),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('preserves hostname-first resolution for legacy targets', async () => {
    const target = MonitoringTarget.create('target-legacy', {
      assetId: asset.assetId,
      monitoringType: 'NODE_EXPORTER',
    });

    await expect(createResolver().resolve(target)).resolves.toBe(
      'http://server-01.local:9100/metrics',
    );
  });
});

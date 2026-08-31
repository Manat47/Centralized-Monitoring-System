import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { CollectEnabledTargetsUseCase } from './collect-enabled-targets.use-case';
import { CollectTargetMetricsUseCase } from './collect-target-metrics.use-case';

function createEnabledTarget(
  lastAttemptedAt: Date | null,
  lastCollectedAt: Date | null = null,
): MonitoringTarget {
  return MonitoringTarget.restore({
    targetId: 'target-001',
    assetId: 'asset-001',
    monitoringType: 'NODE_EXPORTER',
    protocol: 'HTTP',
    addressSource: 'IP_ADDRESS',
    port: 9100,
    path: '/metrics',
    scrapeIntervalSeconds: 15,
    verificationStatus: 'VERIFIED',
    verifiedConfigFingerprint: 'fingerprint',
    monitoringEnabled: true,
    archivedAt: null,
    lastVerifiedAt: new Date('2026-08-30T00:00:00.000Z'),
    lastAttemptedAt,
    lastCollectedAt,
    lastError: null,
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

describe('CollectEnabledTargetsUseCase retry cadence', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips a failed target until its scrape interval has elapsed since the last attempt', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T00:00:10.000Z'));

    const repository = {
      findEnabled: jest
        .fn<MonitoringTargetRepository['findEnabled']>()
        .mockResolvedValue([
          createEnabledTarget(new Date('2026-08-30T00:00:00.000Z')),
        ]),
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const collectTargetMetricsUseCase = {
      execute: jest.fn<CollectTargetMetricsUseCase['execute']>(),
    } as unknown as jest.Mocked<CollectTargetMetricsUseCase>;
    const useCase = new CollectEnabledTargetsUseCase(
      repository,
      collectTargetMetricsUseCase,
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      checked: 1,
      collected: 0,
      skipped: 1,
      failed: 0,
    });
    expect(collectTargetMetricsUseCase.execute.mock.calls).toHaveLength(0);
  });

  it('collects a target once its scrape interval has elapsed since the last attempt', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T00:00:15.000Z'));

    const repository = {
      findEnabled: jest
        .fn<MonitoringTargetRepository['findEnabled']>()
        .mockResolvedValue([
          createEnabledTarget(new Date('2026-08-30T00:00:00.000Z')),
        ]),
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const execute = jest
      .fn<CollectTargetMetricsUseCase['execute']>()
      .mockResolvedValue([]);
    const collectTargetMetricsUseCase = {
      execute,
    } as unknown as jest.Mocked<CollectTargetMetricsUseCase>;
    const useCase = new CollectEnabledTargetsUseCase(
      repository,
      collectTargetMetricsUseCase,
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      checked: 1,
      collected: 1,
      skipped: 0,
      failed: 0,
    });
    expect(execute).toHaveBeenCalledWith('target-001');
  });

  it('uses the last successful collection as a fallback for legacy targets', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T00:00:10.000Z'));

    const repository = {
      findEnabled: jest
        .fn<MonitoringTargetRepository['findEnabled']>()
        .mockResolvedValue([
          createEnabledTarget(null, new Date('2026-08-30T00:00:00.000Z')),
        ]),
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const collectTargetMetricsUseCase = {
      execute: jest.fn<CollectTargetMetricsUseCase['execute']>(),
    } as unknown as jest.Mocked<CollectTargetMetricsUseCase>;
    const useCase = new CollectEnabledTargetsUseCase(
      repository,
      collectTargetMetricsUseCase,
    );

    const result = await useCase.execute();

    expect(result.skipped).toBe(1);
    expect(collectTargetMetricsUseCase.execute.mock.calls).toHaveLength(0);
  });
});

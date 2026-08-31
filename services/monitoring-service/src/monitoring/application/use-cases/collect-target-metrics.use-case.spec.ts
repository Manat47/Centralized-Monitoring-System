import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { MetricsCollectorResolver } from '../../domain/ports/metrics-collector-resolver.port';
import type { MetricsParser } from '../../domain/ports/metrics-parser.port';
import type { MetricsStorage } from '../../domain/ports/metrics-storage.port';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { MonitoringConfigFingerprintService } from '../services/monitoring-config-fingerprint.service';
import { MonitoringEndpointResolver } from '../services/monitoring-endpoint-resolver.service';
import { CollectTargetMetricsUseCase } from './collect-target-metrics.use-case';

function createEnabledTarget(): MonitoringTarget {
  const target = MonitoringTarget.create('target-001', {
    assetId: 'asset-001',
    monitoringType: 'NODE_EXPORTER',
    addressSource: 'IP_ADDRESS',
  });

  target.markVerified('fingerprint');
  target.enableMonitoring();

  return target;
}

describe('CollectTargetMetricsUseCase attempt tracking', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists the attempt before resolving or contacting the endpoint', async () => {
    jest.useFakeTimers();
    const attemptedAt = new Date('2026-08-30T00:00:00.000Z');
    jest.setSystemTime(attemptedAt);

    const target = createEnabledTarget();
    const update = jest
      .fn<MonitoringTargetRepository['update']>()
      .mockRejectedValueOnce(new Error('database unavailable'));
    const repository = {
      findById: jest
        .fn<MonitoringTargetRepository['findById']>()
        .mockResolvedValue(target),
      update,
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const collectorResolver = {
      resolve: jest.fn<MetricsCollectorResolver['resolve']>(),
    } as unknown as jest.Mocked<MetricsCollectorResolver>;
    const metricsParser = {
      parse: jest.fn<MetricsParser['parse']>(),
    } as unknown as jest.Mocked<MetricsParser>;
    const metricsStorage = {
      writeMetrics: jest.fn<MetricsStorage['writeMetrics']>(),
    } as unknown as jest.Mocked<MetricsStorage>;
    const endpointResolver = {
      resolve: jest.fn<MonitoringEndpointResolver['resolve']>(),
    } as unknown as jest.Mocked<MonitoringEndpointResolver>;
    const fingerprintService = {
      create: jest.fn<MonitoringConfigFingerprintService['create']>(),
    } as unknown as jest.Mocked<MonitoringConfigFingerprintService>;
    const useCase = new CollectTargetMetricsUseCase(
      repository,
      collectorResolver,
      metricsParser,
      metricsStorage,
      endpointResolver,
      fingerprintService,
    );

    await expect(useCase.execute('target-001')).rejects.toThrow(
      'database unavailable',
    );

    expect(target.toObject().lastAttemptedAt).toEqual(attemptedAt);
    expect(update).toHaveBeenCalledTimes(1);
    expect(endpointResolver.resolve.mock.calls).toHaveLength(0);
    expect(collectorResolver.resolve.mock.calls).toHaveLength(0);
  });

  it('keeps the last successful collection unchanged when an attempt fails', async () => {
    jest.useFakeTimers();
    const attemptedAt = new Date('2026-08-30T00:00:00.000Z');
    jest.setSystemTime(attemptedAt);

    const target = createEnabledTarget();
    const update = jest
      .fn<MonitoringTargetRepository['update']>()
      .mockImplementation((value) => Promise.resolve(value));
    const repository = {
      findById: jest
        .fn<MonitoringTargetRepository['findById']>()
        .mockResolvedValue(target),
      update,
    } as unknown as jest.Mocked<MonitoringTargetRepository>;
    const collect = jest.fn().mockResolvedValue({
      success: false,
      rawMetrics: null,
      collectedAt: attemptedAt,
      errorMessage: 'The operation was aborted due to timeout',
    });
    const collectorResolver = {
      resolve: jest.fn<MetricsCollectorResolver['resolve']>().mockReturnValue({
        verify: jest.fn(),
        collect,
      }),
    } as unknown as jest.Mocked<MetricsCollectorResolver>;
    const metricsParser = {
      parse: jest.fn<MetricsParser['parse']>(),
    } as unknown as jest.Mocked<MetricsParser>;
    const metricsStorage = {
      writeMetrics: jest.fn<MetricsStorage['writeMetrics']>(),
    } as unknown as jest.Mocked<MetricsStorage>;
    const endpointResolver = {
      resolve: jest
        .fn<MonitoringEndpointResolver['resolve']>()
        .mockResolvedValue('http://192.0.2.1:9100/metrics'),
    } as unknown as jest.Mocked<MonitoringEndpointResolver>;
    const fingerprintService = {
      create: jest
        .fn<MonitoringConfigFingerprintService['create']>()
        .mockReturnValue('fingerprint'),
    } as unknown as jest.Mocked<MonitoringConfigFingerprintService>;
    const useCase = new CollectTargetMetricsUseCase(
      repository,
      collectorResolver,
      metricsParser,
      metricsStorage,
      endpointResolver,
      fingerprintService,
    );

    await expect(useCase.execute('target-001')).rejects.toThrow(
      'The operation was aborted due to timeout',
    );

    expect(target.toObject()).toMatchObject({
      lastAttemptedAt: attemptedAt,
      lastCollectedAt: null,
      lastError: 'The operation was aborted due to timeout',
    });
    expect(update).toHaveBeenCalledTimes(2);
  });
});

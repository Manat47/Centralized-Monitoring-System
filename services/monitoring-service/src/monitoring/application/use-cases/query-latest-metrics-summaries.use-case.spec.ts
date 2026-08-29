import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { MetricsQuery } from '../../domain/ports/metrics-query.port';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { QueryLatestMetricsSummariesUseCase } from './query-latest-metrics-summaries.use-case';

describe('QueryLatestMetricsSummariesUseCase', () => {
  function enabledTarget(): MonitoringTarget {
    const target = MonitoringTarget.create('target-1', {
      assetId: 'asset-1',
      monitoringType: 'NODE_EXPORTER',
      scrapeIntervalSeconds: 15,
    });
    target.markVerified('fingerprint');
    target.enableMonitoring();
    return target;
  }

  function repository(
    targets: MonitoringTarget[],
  ): jest.Mocked<MonitoringTargetRepository> {
    return {
      create: jest.fn(),
      findAll: jest.fn().mockResolvedValue(targets),
      findById: jest.fn(),
      findAllByAssetId: jest.fn(),
      findByAssetIdAndMonitoringType: jest.fn(),
      findEnabled: jest.fn(),
      update: jest.fn(),
    };
  }

  function point(
    timestamp: string,
    value: number,
    labels: Record<string, string> = {},
  ) {
    return {
      assetId: 'asset-1',
      timestamp: new Date(timestamp),
      value,
      labels,
    };
  }

  it('returns latest CPU and memory values with a constant number of queries', async () => {
    const metricsQuery: jest.Mocked<MetricsQuery> = {
      queryMetric: jest.fn(),
      queryMetricForAssets: jest.fn().mockImplementation(({ measurement }) => {
        if (measurement === 'node_cpu_seconds_total') {
          return Promise.resolve([
            point('2026-08-29T09:59:30.000Z', 20, {
              cpu: '0',
              mode: 'user',
            }),
            point('2026-08-29T09:59:30.000Z', 80, {
              cpu: '0',
              mode: 'idle',
            }),
            point('2026-08-29T09:59:45.000Z', 30, {
              cpu: '0',
              mode: 'user',
            }),
            point('2026-08-29T09:59:45.000Z', 90, {
              cpu: '0',
              mode: 'idle',
            }),
          ]);
        }

        if (measurement === 'node_memory_MemTotal_bytes') {
          return Promise.resolve([point('2026-08-29T09:59:45.000Z', 100)]);
        }

        return Promise.resolve([point('2026-08-29T09:59:45.000Z', 40)]);
      }),
    };
    const useCase = new QueryLatestMetricsSummariesUseCase(
      repository([enabledTarget()]),
      metricsQuery,
    );

    await expect(
      useCase.execute(new Date('2026-08-29T10:00:00.000Z')),
    ).resolves.toEqual([
      {
        assetId: 'asset-1',
        timestamp: new Date('2026-08-29T09:59:45.000Z'),
        cpuUsagePercent: 50,
        memoryUsagePercent: 60,
      },
    ]);
    expect(metricsQuery.queryMetricForAssets).toHaveBeenCalledTimes(3);
  });

  it('does not query InfluxDB when no targets are enabled', async () => {
    const metricsQuery: jest.Mocked<MetricsQuery> = {
      queryMetric: jest.fn(),
      queryMetricForAssets: jest.fn(),
    };
    const useCase = new QueryLatestMetricsSummariesUseCase(
      repository([]),
      metricsQuery,
    );

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(metricsQuery.queryMetricForAssets).not.toHaveBeenCalled();
  });
});

import { Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type AssetMetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

interface CpuSnapshot {
  timestamp: Date;
  modes: Map<string, number>;
}

export interface LatestMetricsSummary {
  assetId: string;
  timestamp: Date | null;
  cpuUsagePercent: number | null;
  memoryUsagePercent: number | null;
}

@Injectable()
export class QueryLatestMetricsSummariesUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly targetRepository: MonitoringTargetRepository,
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(now = new Date()): Promise<LatestMetricsSummary[]> {
    const targets = await this.targetRepository.findAll();
    const enabledTargets = targets
      .map((target) => target.toObject())
      .filter(
        (target) =>
          target.monitoringType === 'NODE_EXPORTER' && target.monitoringEnabled,
      );
    const assetIds = [
      ...new Set(enabledTargets.map((target) => target.assetId)),
    ];

    if (assetIds.length === 0) {
      return [];
    }

    const longestIntervalSeconds = Math.max(
      ...enabledTargets.map((target) => target.scrapeIntervalSeconds),
    );
    const rangeMs = Math.max(longestIntervalSeconds * 3 * 1000, 5 * 60_000);
    const start = new Date(now.getTime() - rangeMs);

    const [cpuPoints, totalMemoryPoints, availableMemoryPoints] =
      await Promise.all([
        this.metricsQuery.queryMetricForAssets({
          assetIds,
          measurement: 'node_cpu_seconds_total',
          start,
          end: now,
        }),
        this.metricsQuery.queryMetricForAssets({
          assetIds,
          measurement: 'node_memory_MemTotal_bytes',
          start,
          end: now,
        }),
        this.metricsQuery.queryMetricForAssets({
          assetIds,
          measurement: 'node_memory_MemAvailable_bytes',
          start,
          end: now,
        }),
      ]);

    const cpuByAsset = this.calculateLatestCpuUsage(cpuPoints);
    const memoryByAsset = this.calculateLatestMemoryUsage(
      totalMemoryPoints,
      availableMemoryPoints,
    );

    return assetIds.map((assetId) => {
      const cpu = cpuByAsset.get(assetId);
      const memory = memoryByAsset.get(assetId);
      const timestamps = [cpu?.timestamp, memory?.timestamp].filter(
        (timestamp): timestamp is Date => timestamp !== undefined,
      );

      return {
        assetId,
        timestamp:
          timestamps.length > 0
            ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
            : null,
        cpuUsagePercent: cpu?.usagePercent ?? null,
        memoryUsagePercent: memory?.usagePercent ?? null,
      };
    });
  }

  private calculateLatestCpuUsage(
    points: AssetMetricDataPoint[],
  ): Map<string, { timestamp: Date; usagePercent: number }> {
    const snapshots = new Map<string, CpuSnapshot>();

    for (const point of points) {
      const cpu = point.labels.cpu;
      const mode = point.labels.mode;

      if (!cpu || !mode) {
        continue;
      }

      const key = `${point.assetId}|${cpu}|${point.timestamp.getTime()}`;
      const snapshot = snapshots.get(key) ?? {
        timestamp: point.timestamp,
        modes: new Map<string, number>(),
      };

      snapshot.modes.set(mode, point.value);
      snapshots.set(key, snapshot);
    }

    const snapshotsByAssetAndCpu = new Map<string, CpuSnapshot[]>();

    for (const [key, snapshot] of snapshots) {
      const [assetId, cpu] = key.split('|');

      if (!assetId || !cpu) {
        continue;
      }

      const groupKey = `${assetId}|${cpu}`;
      const group = snapshotsByAssetAndCpu.get(groupKey) ?? [];
      group.push(snapshot);
      snapshotsByAssetAndCpu.set(groupKey, group);
    }

    const usageByAssetAndTimestamp = new Map<
      string,
      { assetId: string; timestamp: Date; values: number[] }
    >();

    for (const [key, group] of snapshotsByAssetAndCpu) {
      group.sort(
        (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
      );
      const assetId = key.split('|')[0];

      if (!assetId) {
        continue;
      }

      for (let index = 1; index < group.length; index += 1) {
        const previous = group[index - 1];
        const current = group[index];

        if (!previous || !current) {
          continue;
        }

        const usage = this.calculateCpuUsage(previous, current);

        if (usage === null) {
          continue;
        }

        const timestampKey = `${assetId}|${current.timestamp.getTime()}`;
        const entry = usageByAssetAndTimestamp.get(timestampKey) ?? {
          assetId,
          timestamp: current.timestamp,
          values: [],
        };
        entry.values.push(usage);
        usageByAssetAndTimestamp.set(timestampKey, entry);
      }
    }

    const latestByAsset = new Map<
      string,
      { timestamp: Date; usagePercent: number }
    >();

    for (const entry of usageByAssetAndTimestamp.values()) {
      const current = latestByAsset.get(entry.assetId);

      if (current && current.timestamp > entry.timestamp) {
        continue;
      }

      const average =
        entry.values.reduce((sum, value) => sum + value, 0) /
        entry.values.length;

      latestByAsset.set(entry.assetId, {
        timestamp: entry.timestamp,
        usagePercent: Math.round(average * 100) / 100,
      });
    }

    return latestByAsset;
  }

  private calculateCpuUsage(
    previous: CpuSnapshot,
    current: CpuSnapshot,
  ): number | null {
    let totalDelta = 0;
    let idleDelta = 0;

    for (const [mode, currentValue] of current.modes) {
      const previousValue = previous.modes.get(mode);

      if (previousValue === undefined) {
        continue;
      }

      const delta = currentValue - previousValue;

      if (delta < 0) {
        return null;
      }

      totalDelta += delta;

      if (mode === 'idle' || mode === 'iowait') {
        idleDelta += delta;
      }
    }

    return totalDelta > 0
      ? ((totalDelta - idleDelta) / totalDelta) * 100
      : null;
  }

  private calculateLatestMemoryUsage(
    totalPoints: AssetMetricDataPoint[],
    availablePoints: AssetMetricDataPoint[],
  ): Map<string, { timestamp: Date; usagePercent: number }> {
    const availableByAssetAndTimestamp = new Map(
      availablePoints.map((point) => [
        `${point.assetId}|${point.timestamp.getTime()}`,
        point.value,
      ]),
    );
    const latestByAsset = new Map<
      string,
      { timestamp: Date; usagePercent: number }
    >();

    for (const point of totalPoints) {
      const available = availableByAssetAndTimestamp.get(
        `${point.assetId}|${point.timestamp.getTime()}`,
      );

      if (available === undefined || point.value <= 0) {
        continue;
      }

      const current = latestByAsset.get(point.assetId);

      if (current && current.timestamp > point.timestamp) {
        continue;
      }

      latestByAsset.set(point.assetId, {
        timestamp: point.timestamp,
        usagePercent:
          Math.round(((point.value - available) / point.value) * 10_000) / 100,
      });
    }

    return latestByAsset;
  }
}

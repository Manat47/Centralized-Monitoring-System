import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryCpuUsageInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface CpuUsageDataPoint {
  timestamp: Date;
  cpu: string;
  usagePercent: number;
}

interface CpuSnapshot {
  timestamp: Date;
  modes: Map<string, number>;
}

@Injectable()
export class QueryCpuUsageUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(input: QueryCpuUsageInput): Promise<CpuUsageDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const points = await this.metricsQuery.queryMetric({
      assetId: input.assetId,
      measurement: 'node_cpu_seconds_total',
      start: input.start,
      end: input.end,
    });

    const snapshotsByCpu = this.groupSnapshotsByCpu(points);

    const result: CpuUsageDataPoint[] = [];

    for (const [cpu, snapshots] of snapshotsByCpu) {
      snapshots.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (let index = 1; index < snapshots.length; index += 1) {
        const previous = snapshots[index - 1];
        const current = snapshots[index];

        if (!previous || !current) {
          continue;
        }

        const usagePercent = this.calculateUsagePercent(previous, current);

        if (usagePercent === null) {
          continue;
        }

        result.push({
          timestamp: current.timestamp,
          cpu,
          usagePercent,
        });
      }
    }

    return result;
  }

  private groupSnapshotsByCpu(
    points: MetricDataPoint[],
  ): Map<string, CpuSnapshot[]> {
    const snapshotMap = new Map<string, CpuSnapshot>();

    for (const point of points) {
      const cpu = point.labels.cpu;
      const mode = point.labels.mode;

      if (!cpu || !mode) {
        continue;
      }

      const key = [cpu, point.timestamp.getTime()].join('|');

      let snapshot = snapshotMap.get(key);

      if (!snapshot) {
        snapshot = {
          timestamp: point.timestamp,
          modes: new Map<string, number>(),
        };

        snapshotMap.set(key, snapshot);
      }

      snapshot.modes.set(mode, point.value);
    }

    const snapshotsByCpu = new Map<string, CpuSnapshot[]>();

    for (const [key, snapshot] of snapshotMap) {
      const [cpu] = key.split('|');

      if (!cpu) {
        continue;
      }

      const snapshots = snapshotsByCpu.get(cpu) ?? [];

      snapshots.push(snapshot);
      snapshotsByCpu.set(cpu, snapshots);
    }

    return snapshotsByCpu;
  }

  private calculateUsagePercent(
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

    if (totalDelta <= 0) {
      return null;
    }

    const usagePercent = ((totalDelta - idleDelta) / totalDelta) * 100;

    return Math.round(usagePercent * 100) / 100;
  }
}

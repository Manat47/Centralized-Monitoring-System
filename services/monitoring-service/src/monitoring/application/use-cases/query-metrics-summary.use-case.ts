import { BadRequestException, Injectable } from '@nestjs/common';

import {
  type CpuUsageDataPoint,
  QueryCpuUsageUseCase,
} from './query-cpu-usage.use-case';
import {
  type DiskUsageDataPoint,
  QueryDiskUsageUseCase,
} from './query-disk-usage.use-case';
import {
  type MemoryUsageDataPoint,
  QueryMemoryUsageUseCase,
} from './query-memory-usage.use-case';
import {
  type NetworkRateDataPoint,
  QueryNetworkRateUseCase,
} from './query-network-rate.use-case';

export interface QueryMetricsSummaryInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface MetricsSummaryResult {
  assetId: string;
  timestamp: Date | null;

  cpu: {
    averageUsagePercent: number | null;
    cores: CpuUsageDataPoint[];
  };

  memory: MemoryUsageDataPoint | null;

  disks: DiskUsageDataPoint[];

  networks: NetworkRateDataPoint[];
}

@Injectable()
export class QueryMetricsSummaryUseCase {
  constructor(
    private readonly queryCpuUsageUseCase: QueryCpuUsageUseCase,

    private readonly queryMemoryUsageUseCase: QueryMemoryUsageUseCase,

    private readonly queryDiskUsageUseCase: QueryDiskUsageUseCase,

    private readonly queryNetworkRateUseCase: QueryNetworkRateUseCase,
  ) {}

  async execute(
    input: QueryMetricsSummaryInput,
  ): Promise<MetricsSummaryResult> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const [cpuPoints, memoryPoints, diskPoints, networkPoints] =
      await Promise.all([
        this.queryCpuUsageUseCase.execute(input),
        this.queryMemoryUsageUseCase.execute(input),
        this.queryDiskUsageUseCase.execute(input),
        this.queryNetworkRateUseCase.execute(input),
      ]);

    const latestCpuPoints = this.findLatestCpuPoints(cpuPoints);

    const latestMemory = this.findLatestPoint(memoryPoints);

    const latestDisks = this.findLatestByKey(
      diskPoints,
      (point) => `${point.device}|${point.mountpoint}`,
    );

    const latestNetworks = this.findLatestByKey(
      networkPoints,
      (point) => point.device,
    );

    const averageCpuUsage = this.calculateAverageCpuUsage(latestCpuPoints);

    const timestamps = [
      ...latestCpuPoints.map((point) => point.timestamp.getTime()),
      latestMemory?.timestamp.getTime(),
      ...latestDisks.map((point) => point.timestamp.getTime()),
      ...latestNetworks.map((point) => point.timestamp.getTime()),
    ].filter((timestamp): timestamp is number => timestamp !== undefined);

    return {
      assetId: input.assetId,
      timestamp:
        timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,

      cpu: {
        averageUsagePercent: averageCpuUsage,
        cores: latestCpuPoints,
      },

      memory: latestMemory,
      disks: latestDisks,
      networks: latestNetworks,
    };
  }

  private findLatestCpuPoints(
    points: CpuUsageDataPoint[],
  ): CpuUsageDataPoint[] {
    if (points.length === 0) {
      return [];
    }

    const latestTimestamp = Math.max(
      ...points.map((point) => point.timestamp.getTime()),
    );

    return points.filter(
      (point) => point.timestamp.getTime() === latestTimestamp,
    );
  }

  private findLatestPoint<
    T extends {
      timestamp: Date;
    },
  >(points: T[]): T | null {
    if (points.length === 0) {
      return null;
    }

    return points.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest,
    );
  }

  private findLatestByKey<
    T extends {
      timestamp: Date;
    },
  >(points: T[], getKey: (point: T) => string): T[] {
    const latestByKey = new Map<string, T>();

    for (const point of points) {
      const key = getKey(point);
      const current = latestByKey.get(key);

      if (!current || point.timestamp > current.timestamp) {
        latestByKey.set(key, point);
      }
    }

    return [...latestByKey.values()];
  }

  private calculateAverageCpuUsage(points: CpuUsageDataPoint[]): number | null {
    if (points.length === 0) {
      return null;
    }

    const total = points.reduce((sum, point) => sum + point.usagePercent, 0);

    return Math.round((total / points.length) * 100) / 100;
  }
}

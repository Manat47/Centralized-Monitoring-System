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

export interface QueryMetricsReportSummaryInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface MetricsReportSummary {
  assetId: string;

  cpu: {
    averageUsagePercent: number | null;
    minUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;
  };

  memory: {
    averageUsagePercent: number | null;
    minUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;

    averageUsedBytes: number | null;
    maxUsedBytes: number | null;
    totalBytes: number | null;
  };

  disks: Array<{
    device: string;
    mountpoint: string;
    filesystemType: string;

    totalBytes: number | null;

    latestUsagePercent: number | null;
    averageUsagePercent: number | null;
    maxUsagePercent: number | null;
    p95UsagePercent: number | null;

    latestUsedBytes: number | null;
    latestAvailableBytes: number | null;
    minAvailableBytes: number | null;

    usedChangeBytes: number | null;
  }>;

  networks: Array<{
    device: string;

    averageReceiveBytesPerSecond: number | null;
    maxReceiveBytesPerSecond: number | null;
    p95ReceiveBytesPerSecond: number | null;

    averageTransmitBytesPerSecond: number | null;
    maxTransmitBytesPerSecond: number | null;
    p95TransmitBytesPerSecond: number | null;
  }>;
}

@Injectable()
export class QueryMetricsReportSummaryUseCase {
  constructor(
    private readonly queryCpuUsageUseCase: QueryCpuUsageUseCase,
    private readonly queryMemoryUsageUseCase: QueryMemoryUsageUseCase,
    private readonly queryDiskUsageUseCase: QueryDiskUsageUseCase,
    private readonly queryNetworkRateUseCase: QueryNetworkRateUseCase,
  ) {}

  async execute(
    input: QueryMetricsReportSummaryInput,
  ): Promise<MetricsReportSummary> {
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

    return {
      assetId: input.assetId,
      cpu: this.summarizeCpu(cpuPoints),
      memory: this.summarizeMemory(memoryPoints),
      disks: this.summarizeDisks(diskPoints),
      networks: this.summarizeNetworks(networkPoints),
    };
  }

  private summarizeCpu(points: CpuUsageDataPoint[]) {
    const usageByTimestamp = new Map<number, number[]>();

    for (const point of points) {
      const timestamp = point.timestamp.getTime();

      const values = usageByTimestamp.get(timestamp) ?? [];

      values.push(point.usagePercent);

      usageByTimestamp.set(timestamp, values);
    }

    const machineUsageValues = [...usageByTimestamp.values()].map((values) =>
      this.average(values),
    );

    return {
      averageUsagePercent: this.averageOrNull(machineUsageValues),
      minUsagePercent: this.minOrNull(machineUsageValues),
      maxUsagePercent: this.maxOrNull(machineUsageValues),
      p95UsagePercent: this.percentile95(machineUsageValues),
    };
  }

  private summarizeMemory(points: MemoryUsageDataPoint[]) {
    const usageValues = points.map((point) => point.usagePercent);
    const usedValues = points.map((point) => point.usedBytes);

    const latestPoint = this.findLatestPoint(points);

    return {
      averageUsagePercent: this.averageOrNull(usageValues),
      minUsagePercent: this.minOrNull(usageValues),
      maxUsagePercent: this.maxOrNull(usageValues),
      p95UsagePercent: this.percentile95(usageValues),

      averageUsedBytes: this.averageOrNull(usedValues),
      maxUsedBytes: this.maxOrNull(usedValues),

      totalBytes: latestPoint?.totalBytes ?? null,
    };
  }

  private summarizeDisks(points: DiskUsageDataPoint[]) {
    const groups = new Map<string, DiskUsageDataPoint[]>();

    for (const point of points) {
      const key = [point.device, point.mountpoint, point.filesystemType].join(
        '|',
      );

      const group = groups.get(key) ?? [];

      group.push(point);

      groups.set(key, group);
    }

    return [...groups.values()].map((group) => {
      const sorted = [...group].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      const first = sorted[0];
      const latest = sorted[sorted.length - 1];

      const usageValues = sorted.map((point) => point.usagePercent);
      const availableValues = sorted.map((point) => point.availableBytes);

      return {
        device: latest?.device ?? 'unknown',
        mountpoint: latest?.mountpoint ?? 'unknown',
        filesystemType: latest?.filesystemType ?? 'unknown',

        totalBytes: latest?.totalBytes ?? null,

        latestUsagePercent: latest?.usagePercent ?? null,
        averageUsagePercent: this.averageOrNull(usageValues),
        maxUsagePercent: this.maxOrNull(usageValues),
        p95UsagePercent: this.percentile95(usageValues),

        latestUsedBytes: latest?.usedBytes ?? null,
        latestAvailableBytes: latest?.availableBytes ?? null,

        minAvailableBytes: this.minOrNull(availableValues),

        usedChangeBytes:
          first && latest
            ? this.round(latest.usedBytes - first.usedBytes)
            : null,
      };
    });
  }

  private summarizeNetworks(points: NetworkRateDataPoint[]) {
    const groups = new Map<string, NetworkRateDataPoint[]>();

    for (const point of points) {
      const group = groups.get(point.device) ?? [];

      group.push(point);

      groups.set(point.device, group);
    }

    return [...groups.entries()].map(([device, group]) => {
      const receiveValues = group.map((point) => point.receiveBytesPerSecond);

      const transmitValues = group.map((point) => point.transmitBytesPerSecond);

      return {
        device,

        averageReceiveBytesPerSecond: this.averageOrNull(receiveValues),

        maxReceiveBytesPerSecond: this.maxOrNull(receiveValues),

        p95ReceiveBytesPerSecond: this.percentile95(receiveValues),

        averageTransmitBytesPerSecond: this.averageOrNull(transmitValues),

        maxTransmitBytesPerSecond: this.maxOrNull(transmitValues),

        p95TransmitBytesPerSecond: this.percentile95(transmitValues),
      };
    });
  }

  private findLatestPoint<T extends { timestamp: Date }>(
    points: T[],
  ): T | null {
    if (points.length === 0) {
      return null;
    }

    return points.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest,
    );
  }

  private average(values: number[]): number {
    const total = values.reduce((sum, value) => sum + value, 0);

    return this.round(total / values.length);
  }

  private averageOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return this.average(values);
  }

  private minOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return this.round(Math.min(...values));
  }

  private maxOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return this.round(Math.max(...values));
  }

  private percentile95(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    const index = Math.ceil(sorted.length * 0.95) - 1;

    return this.round(sorted[index] ?? sorted[sorted.length - 1]);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

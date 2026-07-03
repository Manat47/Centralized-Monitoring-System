import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryDiskUsageInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface DiskUsageDataPoint {
  timestamp: Date;
  device: string;
  mountpoint: string;
  filesystemType: string;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number;
}

@Injectable()
export class QueryDiskUsageUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(input: QueryDiskUsageInput): Promise<DiskUsageDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const [sizePoints, availablePoints] = await Promise.all([
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_filesystem_size_bytes',
        start: input.start,
        end: input.end,
      }),
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_filesystem_avail_bytes',
        start: input.start,
        end: input.end,
      }),
    ]);

    const availableByKey = new Map<string, number>();

    for (const point of availablePoints) {
      availableByKey.set(this.createPointKey(point), point.value);
    }

    const result: DiskUsageDataPoint[] = [];

    for (const sizePoint of sizePoints) {
      const availableBytes = availableByKey.get(this.createPointKey(sizePoint));

      if (availableBytes === undefined || sizePoint.value <= 0) {
        continue;
      }

      const totalBytes = sizePoint.value;
      const usedBytes = totalBytes - availableBytes;

      const usagePercent = (usedBytes / totalBytes) * 100;

      result.push({
        timestamp: sizePoint.timestamp,
        device: sizePoint.labels.device ?? 'unknown',
        mountpoint: sizePoint.labels.mountpoint ?? 'unknown',
        filesystemType: sizePoint.labels.fstype ?? 'unknown',
        usedBytes,
        availableBytes,
        totalBytes,
        usagePercent: Math.round(usagePercent * 100) / 100,
      });
    }

    return result;
  }

  private createPointKey(point: MetricDataPoint): string {
    return [
      point.timestamp.getTime(),
      point.labels.device ?? '',
      point.labels.mountpoint ?? '',
      point.labels.fstype ?? '',
    ].join('|');
  }
}

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryMemoryUsageInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface MemoryUsageDataPoint {
  timestamp: Date;
  usedBytes: number;
  availableBytes: number;
  totalBytes: number;
  usagePercent: number;
}

@Injectable()
export class QueryMemoryUsageUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(input: QueryMemoryUsageInput): Promise<MemoryUsageDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const [totalPoints, availablePoints] = await Promise.all([
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_memory_MemTotal_bytes',
        start: input.start,
        end: input.end,
      }),
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_memory_MemAvailable_bytes',
        start: input.start,
        end: input.end,
      }),
    ]);

    const availableByTimestamp = new Map(
      availablePoints.map((point) => [point.timestamp.getTime(), point.value]),
    );

    const result: MemoryUsageDataPoint[] = [];

    for (const totalPoint of totalPoints) {
      const timestamp = totalPoint.timestamp.getTime();

      const availableBytes = availableByTimestamp.get(timestamp);

      if (availableBytes === undefined || totalPoint.value <= 0) {
        continue;
      }

      const totalBytes = totalPoint.value;
      const usedBytes = totalBytes - availableBytes;

      const usagePercent = (usedBytes / totalBytes) * 100;

      result.push({
        timestamp: totalPoint.timestamp,
        usedBytes,
        availableBytes,
        totalBytes,
        usagePercent: Math.round(usagePercent * 100) / 100,
      });
    }

    return result;
  }
}

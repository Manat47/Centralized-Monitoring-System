import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryHttpRequestRateInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface HttpRequestRateDataPoint {
  timestamp: Date;
  method: string;
  statusCode: string;
  requestsPerSecond: number;
}

@Injectable()
export class QueryHttpRequestRateUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(
    input: QueryHttpRequestRateInput,
  ): Promise<HttpRequestRateDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const points = await this.metricsQuery.queryMetric({
      assetId: input.assetId,
      measurement: 'http_requests_total',
      start: input.start,
      end: input.end,
    });

    return this.calculateRates(points);
  }

  private calculateRates(
    points: MetricDataPoint[],
  ): HttpRequestRateDataPoint[] {
    const pointsBySeries = new Map<string, MetricDataPoint[]>();

    for (const point of points) {
      const method = point.labels.method;
      const statusCode = point.labels.status_code;

      if (!method || !statusCode) {
        continue;
      }

      const key = `${method}|${statusCode}`;

      const seriesPoints = pointsBySeries.get(key) ?? [];

      seriesPoints.push(point);

      pointsBySeries.set(key, seriesPoints);
    }

    const rates: HttpRequestRateDataPoint[] = [];

    for (const seriesPoints of pointsBySeries.values()) {
      seriesPoints.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      for (let index = 1; index < seriesPoints.length; index += 1) {
        const previous = seriesPoints[index - 1];
        const current = seriesPoints[index];

        if (!previous || !current) {
          continue;
        }

        const elapsedSeconds =
          (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

        const valueDifference = current.value - previous.value;

        if (elapsedSeconds <= 0 || valueDifference < 0) {
          continue;
        }

        const method = current.labels.method;
        const statusCode = current.labels.status_code;

        if (!method || !statusCode) {
          continue;
        }

        rates.push({
          timestamp: current.timestamp,
          method,
          statusCode,
          requestsPerSecond:
            Math.round((valueDifference / elapsedSeconds) * 10000) / 10000,
        });
      }
    }

    return rates;
  }
}

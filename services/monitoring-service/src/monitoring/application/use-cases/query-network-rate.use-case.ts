import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryNetworkRateInput {
  assetId: string;
  start: Date;
  end: Date;
}

export interface NetworkRateDataPoint {
  timestamp: Date;
  device: string;
  receiveBytesPerSecond: number;
  transmitBytesPerSecond: number;
}

interface RatePoint {
  timestamp: Date;
  device: string;
  valuePerSecond: number;
}

@Injectable()
export class QueryNetworkRateUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(input: QueryNetworkRateInput): Promise<NetworkRateDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const [receivePoints, transmitPoints] = await Promise.all([
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_network_receive_bytes_total',
        start: input.start,
        end: input.end,
      }),
      this.metricsQuery.queryMetric({
        assetId: input.assetId,
        measurement: 'node_network_transmit_bytes_total',
        start: input.start,
        end: input.end,
      }),
    ]);

    const receiveRates = this.calculateRates(receivePoints);

    const transmitRates = this.calculateRates(transmitPoints);

    const transmitByKey = new Map<string, RatePoint>();

    for (const point of transmitRates) {
      transmitByKey.set(this.createRateKey(point), point);
    }

    const result: NetworkRateDataPoint[] = [];

    for (const receivePoint of receiveRates) {
      const transmitPoint = transmitByKey.get(this.createRateKey(receivePoint));

      if (!transmitPoint) {
        continue;
      }

      result.push({
        timestamp: receivePoint.timestamp,
        device: receivePoint.device,
        receiveBytesPerSecond: receivePoint.valuePerSecond,
        transmitBytesPerSecond: transmitPoint.valuePerSecond,
      });
    }

    return result;
  }

  private calculateRates(points: MetricDataPoint[]): RatePoint[] {
    const pointsByDevice = new Map<string, MetricDataPoint[]>();

    for (const point of points) {
      const device = point.labels.device ?? 'unknown';

      const devicePoints = pointsByDevice.get(device) ?? [];

      devicePoints.push(point);
      pointsByDevice.set(device, devicePoints);
    }

    const rates: RatePoint[] = [];

    for (const [device, devicePoints] of pointsByDevice.entries()) {
      devicePoints.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      for (let index = 1; index < devicePoints.length; index += 1) {
        const previous = devicePoints[index - 1];
        const current = devicePoints[index];

        if (!previous || !current) {
          continue;
        }

        const elapsedSeconds =
          (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

        const valueDifference = current.value - previous.value;

        if (elapsedSeconds <= 0 || valueDifference < 0) {
          continue;
        }

        rates.push({
          timestamp: current.timestamp,
          device,
          valuePerSecond:
            Math.round((valueDifference / elapsedSeconds) * 100) / 100,
        });
      }
    }

    return rates;
  }

  private createRateKey(point: RatePoint): string {
    return [point.timestamp.getTime(), point.device].join('|');
  }
}

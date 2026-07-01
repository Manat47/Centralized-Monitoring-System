import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, type WriteApi } from '@influxdata/influxdb-client';

import type {
  MetricsStorage,
  StoreMetricsInput,
} from '../../domain/ports/metrics-storage.port';

@Injectable()
export class InfluxMetricsStorage implements MetricsStorage {
  private readonly writeApi: WriteApi;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('INFLUXDB_URL');

    const token = this.configService.get<string>('INFLUXDB_TOKEN');

    const org = this.configService.get<string>('INFLUXDB_ORG');

    const bucket = this.configService.get<string>('INFLUXDB_BUCKET');

    if (!url || !token || !org || !bucket) {
      throw new Error('InfluxDB configuration is incomplete');
    }

    const influxDB = new InfluxDB({
      url,
      token,
    });

    this.writeApi = influxDB.getWriteApi(org, bucket, 'ms');
  }

  async writeMetrics(input: StoreMetricsInput): Promise<void> {
    const points = input.metrics.map((metric) => {
      const point = new Point(metric.name)
        .tag('assetId', input.assetId)
        .tag('targetId', input.targetId)
        .floatField('value', metric.value)
        .timestamp(metric.collectedAt);

      for (const [labelName, labelValue] of Object.entries(metric.labels)) {
        point.tag(labelName, labelValue);
      }

      return point;
    });

    this.writeApi.writePoints(points);

    await this.writeApi.flush();
  }
}

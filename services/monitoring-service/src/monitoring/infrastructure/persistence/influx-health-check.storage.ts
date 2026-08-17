import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, type WriteApi } from '@influxdata/influxdb-client';

import type {
  HealthCheckStorage,
  StoreHealthCheckResultInput,
} from '../../domain/ports/health-check-storage.port';

@Injectable()
export class InfluxHealthCheckStorage implements HealthCheckStorage {
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

  async writeResult(input: StoreHealthCheckResultInput): Promise<void> {
    const point = new Point('health_check')
      .tag('assetId', input.assetId)
      .tag('healthCheckTargetId', input.healthCheckTargetId)
      .intField('responseTimeMs', input.result.responseTimeMs)
      .timestamp(input.result.checkedAt);

    if (input.result.statusCode !== null) {
      point.intField('statusCode', input.result.statusCode);
    }

    if (input.result.error !== null) {
      point.stringField('error', input.result.error);
    }

    this.writeApi.writePoint(point);

    await this.writeApi.flush();
  }
}

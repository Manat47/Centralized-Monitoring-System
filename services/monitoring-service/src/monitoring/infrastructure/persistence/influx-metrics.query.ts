import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  flux,
  InfluxDB,
  type FluxTableMetaData,
  type QueryApi,
} from '@influxdata/influxdb-client';

import type {
  MetricDataPoint,
  MetricsQuery,
  QueryMetricInput,
} from '../../domain/ports/metrics-query.port';

@Injectable()
export class InfluxMetricsQuery implements MetricsQuery {
  private readonly queryApi: QueryApi;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('INFLUXDB_URL');

    const token = this.configService.get<string>('INFLUXDB_TOKEN');

    const org = this.configService.get<string>('INFLUXDB_ORG');

    const bucket = this.configService.get<string>('INFLUXDB_BUCKET');

    if (!url || !token || !org || !bucket) {
      throw new Error('InfluxDB query configuration is incomplete');
    }

    const influxDB = new InfluxDB({
      url,
      token,
    });

    this.queryApi = influxDB.getQueryApi(org);
    this.bucket = bucket;
  }

  async queryMetric(input: QueryMetricInput): Promise<MetricDataPoint[]> {
    const query = flux`
  from(bucket: ${this.bucket})
    |> range(
      start: ${input.start},
      stop: ${input.end}
    )
    |> filter(
      fn: (r) =>
        r._measurement == ${input.measurement}
    )
    |> filter(
      fn: (r) =>
        r.assetId == ${input.assetId}
    )
    |> filter(
      fn: (r) =>
        r._field == "value"
    )
    |> sort(columns: ["_time"])
`;

    return this.queryApi.collectRows<MetricDataPoint>(
      query,
      (values: string[], tableMeta: FluxTableMetaData) => {
        const row = tableMeta.toObject(values) as Record<string, unknown>;

        const timestamp = row._time;
        const value = row._value;

        if (typeof timestamp !== 'string' || typeof value !== 'number') {
          return undefined;
        }

        return {
          timestamp: new Date(timestamp),
          value,
          labels: this.extractLabels(row),
        };
      },
    );
  }

  private extractLabels(row: Record<string, unknown>): Record<string, string> {
    const excludedColumns = new Set([
      'result',
      'table',
      '_start',
      '_stop',
      '_time',
      '_value',
      '_field',
      '_measurement',
      'assetId',
      'targetId',
    ]);

    const labels: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      if (excludedColumns.has(key) || typeof value !== 'string') {
        continue;
      }

      labels[key] = value;
    }

    return labels;
  }
}

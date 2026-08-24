import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  flux,
  InfluxDB,
  type FluxTableMetaData,
  type QueryApi,
} from '@influxdata/influxdb-client';

import type {
  HealthCheckHistoryPoint,
  HealthCheckQuery,
  QueryHealthCheckHistoryInput,
} from '../../domain/ports/health-check-query.port';

@Injectable()
export class InfluxHealthCheckQuery implements HealthCheckQuery {
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

  async queryHistory(
    input: QueryHealthCheckHistoryInput,
  ): Promise<HealthCheckHistoryPoint[]> {
    const query = flux`
      from(bucket: ${this.bucket})
        |> range(
          start: ${input.start},
          stop: ${input.end}
        )
        |> filter(
          fn: (r) =>
            r._measurement == "health_check"
        )
        |> filter(
          fn: (r) =>
            r.healthCheckTargetId == ${input.healthCheckTargetId}
        )
        |> filter(
          fn: (r) =>
            r._field == "statusCode" or
            r._field == "responseTimeMs" or
            r._field == "error"
        )
        |> sort(columns: ["_time"])
    `;

    interface RawRow {
      timestamp: Date;
      field: string;
      value: unknown;
    }

    const rows = await this.queryApi.collectRows<RawRow>(
      query,
      (values: string[], tableMeta: FluxTableMetaData) => {
        const row = tableMeta.toObject(values) as Record<string, unknown>;

        if (typeof row._time !== 'string' || typeof row._field !== 'string') {
          return undefined;
        }

        return {
          timestamp: new Date(row._time),
          field: row._field,
          value: row._value,
        };
      },
    );

    const pointsByTimestamp = new Map<number, HealthCheckHistoryPoint>();

    for (const row of rows) {
      const key = row.timestamp.getTime();

      let point = pointsByTimestamp.get(key);

      if (!point) {
        point = {
          timestamp: row.timestamp,
          statusCode: null,
          responseTimeMs: 0,
          error: null,
        };

        pointsByTimestamp.set(key, point);
      }

      if (row.field === 'statusCode' && typeof row.value === 'number') {
        point.statusCode = row.value;
      }

      if (row.field === 'responseTimeMs' && typeof row.value === 'number') {
        point.responseTimeMs = row.value;
      }

      if (row.field === 'error' && typeof row.value === 'string') {
        point.error = row.value;
      }
    }

    return [...pointsByTimestamp.values()].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  async queryLatest(
    healthCheckTargetId: string,
  ): Promise<HealthCheckHistoryPoint | null> {
    const query = flux`
    from(bucket: ${this.bucket})
      |> range(start: 0)
      |> filter(
        fn: (r) =>
          r._measurement == "health_check"
      )
      |> filter(
        fn: (r) =>
          r.healthCheckTargetId == ${healthCheckTargetId}
      )
      |> filter(
        fn: (r) =>
          r._field == "statusCode" or
          r._field == "responseTimeMs" or
          r._field == "error"
      )
      |> pivot(
        rowKey: ["_time"],
        columnKey: ["_field"],
        valueColumn: "_value"
      )
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `;

    const rows = await this.queryApi.collectRows<HealthCheckHistoryPoint>(
      query,
      (values: string[], tableMeta: FluxTableMetaData) => {
        const row = tableMeta.toObject(values) as Record<string, unknown>;

        if (typeof row._time !== 'string') {
          return undefined;
        }

        return {
          timestamp: new Date(row._time),

          statusCode:
            typeof row.statusCode === 'number' ? row.statusCode : null,

          responseTimeMs:
            typeof row.responseTimeMs === 'number' ? row.responseTimeMs : 0,

          error: typeof row.error === 'string' ? row.error : null,
        };
      },
    );

    return rows[0] ?? null;
  }

  async queryLatestMany(
    healthCheckTargetIds: string[],
  ): Promise<Map<string, HealthCheckHistoryPoint>> {
    if (healthCheckTargetIds.length === 0) {
      return new Map();
    }

    const requestedIds = new Set(healthCheckTargetIds);
    const query = flux`
      from(bucket: ${this.bucket})
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "health_check")
        |> filter(
          fn: (r) =>
            r._field == "statusCode" or
            r._field == "responseTimeMs" or
            r._field == "error"
        )
        |> pivot(
          rowKey: ["_time"],
          columnKey: ["_field"],
          valueColumn: "_value"
        )
        |> group(columns: ["healthCheckTargetId"])
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 1)
    `;

    interface LatestRow extends HealthCheckHistoryPoint {
      healthCheckTargetId: string;
    }

    const rows = await this.queryApi.collectRows<LatestRow>(
      query,
      (values: string[], tableMeta: FluxTableMetaData) => {
        const row = tableMeta.toObject(values) as Record<string, unknown>;

        if (
          typeof row._time !== 'string' ||
          typeof row.healthCheckTargetId !== 'string' ||
          !requestedIds.has(row.healthCheckTargetId)
        ) {
          return undefined;
        }

        return {
          healthCheckTargetId: row.healthCheckTargetId,
          timestamp: new Date(row._time),
          statusCode:
            typeof row.statusCode === 'number' ? row.statusCode : null,
          responseTimeMs:
            typeof row.responseTimeMs === 'number' ? row.responseTimeMs : 0,
          error: typeof row.error === 'string' ? row.error : null,
        };
      },
    );

    return new Map(
      rows.map((row) => [
        row.healthCheckTargetId,
        {
          timestamp: row.timestamp,
          statusCode: row.statusCode,
          responseTimeMs: row.responseTimeMs,
          error: row.error,
        },
      ]),
    );
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { LogInfrastructure } from './log.infrastructure';

export interface LogFilters {
  from?: string;
  to?: string;
  search?: string;
  source?: string;
  event_type?: string;
  offset?: string;
  limit?: string;
}

@Injectable()
export class LogQueryService {
  constructor(private readonly infra: LogInfrastructure) {}

  async list(projectId: string, filters: LogFilters) {
    const now = Date.now();
    const from = filters.from ? Date.parse(filters.from) : now - 24 * 3600_000;
    const to = filters.to ? Date.parse(filters.to) : now;
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from >= to ||
      from < now - 30 * 86400_000 ||
      to > now + 5 * 60_000
    )
      throw new BadRequestException('Invalid time range');
    const limit = Number(filters.limit ?? 50);
    const offset = Number(filters.offset ?? 0);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 10_000
    )
      throw new BadRequestException('Invalid pagination');
    for (const value of [filters.search, filters.source, filters.event_type]) {
      if (value && value.length > 200)
        throw new BadRequestException('Filter is too long');
    }
    const quoted = (value: string) => JSON.stringify(value);
    const conditions = [
      `r._measurement == "app_log"`,
      `r.project_id == ${quoted(projectId)}`,
      ...(filters.source ? [`r.source == ${quoted(filters.source)}`] : []),
      ...(filters.event_type
        ? [`r.event_type == ${quoted(filters.event_type)}`]
        : []),
    ].join(' and ');
    const query = `import "strings"
from(bucket: ${quoted(this.infra.influxBucket)})
  |> range(start: time(v: ${quoted(new Date(from).toISOString())}), stop: time(v: ${quoted(new Date(to).toISOString())}))
  |> filter(fn: (r) => ${conditions})
  |> pivot(rowKey: ["_time", "project_id", "event_id", "source", "event_type"], columnKey: ["_field"], valueColumn: "_value")
  ${filters.search ? `|> filter(fn: (r) => strings.containsStr(v: r.message, substr: ${quoted(filters.search)}))` : ''}
  |> group()
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: ${limit + 1}, offset: ${offset})`;
    const rows = await new Promise<Record<string, unknown>[]>(
      (resolve, reject) => {
        const found: Record<string, unknown>[] = [];
        this.infra.influx.getQueryApi(this.infra.influxOrg).queryRows(query, {
          next(row, tableMeta) {
            found.push(tableMeta.toObject(row));
          },
          error(error) {
            reject(error);
          },
          complete() {
            resolve(found);
          },
        });
      },
    );
    return {
      items: rows.slice(0, limit).map((row) => ({
        eventId: row.event_id,
        timestamp: row._time,
        source: row.source,
        event_type: row.event_type,
        message: row.message,
        tenant_id: row.tenant_id ?? null,
        status_code: row.status_code ?? null,
        duration_ms: row.duration_ms ?? null,
        metadata:
          typeof row.metadata === 'string'
            ? (JSON.parse(row.metadata) as unknown)
            : {},
      })),
      nextOffset: rows.length > limit ? offset + limit : null,
    };
  }
}

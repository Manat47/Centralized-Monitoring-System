import { BadRequestException, Injectable } from '@nestjs/common';
import { DataStore } from './data.store';

export interface LogFilters {
  from?: string;
  to?: string;
  search?: string;
  source?: string;
  event_type?: string;
  severity?: string;
  exclude_source?: string | string[];
  exclude_event_type?: string | string[];
  exclude_severity?: string | string[];
  offset?: string;
  limit?: string;
}

type ParsedTerm = {
  field: string;
  operator: string;
  value: string;
  negated?: boolean;
};
const FIELDS = [
  'source',
  'event_type',
  'severity',
  'user_id',
  'tag',
  'ip',
  'location',
  'status_code',
  'duration_ms',
  'message',
];

export function parseLogSearch(input: string): ParsedTerm[] {
  const terms: ParsedTerm[] = [];
  let rest = input.trim();
  while (rest) {
    const notPrefix = /^NOT\s+/i.exec(rest);
    const negated = Boolean(notPrefix);
    if (notPrefix) rest = rest.slice(notPrefix[0].length);
    const comparison =
      /^(status_code|duration_ms)\s*(>=|<=|=|>|<)\s*(\d+(?:\.\d+)?)(?:\s+|$)/i.exec(
        rest,
      );
    if (comparison) {
      if (negated)
        throw new BadRequestException('NOT supports payload fields here');
      terms.push({
        field: comparison[1].toLowerCase(),
        operator: comparison[2],
        value: comparison[3],
      });
      rest = rest.slice(comparison[0].length).trimStart();
      continue;
    }
    const keyValue =
      /^([A-Za-z_][A-Za-z_0-9.]*):(?:"([^"]+)"|(\S+))(?:\s+|$)/.exec(rest);
    if (keyValue) {
      const rawField = keyValue[1];
      const field = rawField.toLowerCase().startsWith('payload.')
        ? `payload.${rawField.slice(8)}`
        : rawField.toLowerCase();
      if (
        !FIELDS.includes(field) &&
        !/^payload\.[A-Za-z_][A-Za-z_0-9]*$/.test(field)
      )
        throw new BadRequestException(
          `Unsupported search field: ${field}. Supported fields: ${FIELDS.join(', ')}`,
        );
      if (
        ['status_code', 'duration_ms'].includes(field) &&
        (keyValue[2] ?? keyValue[3]) !== 'Unspecified'
      )
        throw new BadRequestException(`${field} requires a numeric comparison`);
      if (negated && !field.startsWith('payload.'))
        throw new BadRequestException('NOT supports payload fields here');
      terms.push({
        field,
        operator: ':',
        value: keyValue[2] ?? keyValue[3],
        ...(negated ? { negated: true } : {}),
      });
      rest = rest.slice(keyValue[0].length).trimStart();
      continue;
    }
    const unsupported = /^([A-Za-z_][A-Za-z_0-9.]*)\s*(?:[><=]|:)/.exec(rest);
    if (unsupported)
      throw new BadRequestException(
        `Unsupported search field: ${unsupported[1]}. Supported fields: ${FIELDS.join(', ')}`,
      );
    const word = /^(?:"([^"]+)"|(\S+))(?:\s+|$)/.exec(rest);
    if (negated) throw new BadRequestException('NOT requires a payload field');
    if (!word) throw new BadRequestException('Invalid search syntax');
    terms.push({ field: 'message', operator: ':', value: word[1] ?? word[2] });
    rest = rest.slice(word[0].length).trimStart();
  }
  return terms;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class LogQueryService {
  constructor(private readonly db: DataStore) {}

  async values(
    projectId: string,
    field: string,
    query = '',
    from?: string,
    to?: string,
  ) {
    const column =
      field === 'source'
        ? 'source'
        : field === 'event_type'
          ? 'event_type'
          : null;
    if (!column) throw new BadRequestException('Unsupported value field');
    if (query.length > 100)
      throw new BadRequestException('Value search is too long');
    const now = Date.now();
    const start = from ? Date.parse(from) : now - 24 * 3600_000;
    const end = to ? Date.parse(to) : now + 1000;
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start >= end ||
      start < now - 30 * 86400_000 ||
      end > now + 5 * 60_000
    )
      throw new BadRequestException('Invalid time range');
    const rows = await this.db.query<{ value: string; count: string }>(
      `SELECT ${column} AS value,count(*)::text AS count FROM log_event_records
       WHERE project_id=$1 AND received_at >= $2 AND received_at < $3
         AND ${column} ILIKE $4 ESCAPE '\\'
       GROUP BY ${column} ORDER BY count(*) DESC,value LIMIT 50`,
      [
        projectId,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
        `${escapeLike(query)}%`,
      ],
    );
    return rows.rows.map((row) => ({
      value: row.value,
      count: Number(row.count),
    }));
  }

  async list(projectId: string, filters: LogFilters) {
    for (const key of Object.keys(filters))
      if (
        ![
          'from',
          'to',
          'search',
          'source',
          'event_type',
          'severity',
          'exclude_source',
          'exclude_event_type',
          'exclude_severity',
          'offset',
          'limit',
        ].includes(key)
      )
        throw new BadRequestException(
          `Unsupported search field: ${key}. Supported fields: ${FIELDS.join(', ')}`,
        );
    const now = Date.now();
    const from = filters.from ? Date.parse(filters.from) : now - 24 * 3600_000;
    const to = filters.to ? Date.parse(filters.to) : now + 1000;
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
    for (const value of [
      filters.search,
      filters.source,
      filters.event_type,
      filters.severity,
    ])
      if (value && value.length > 200)
        throw new BadRequestException('Filter is too long');
    for (const field of [
      filters.exclude_source,
      filters.exclude_event_type,
      filters.exclude_severity,
    ]) {
      const exclusions =
        field === undefined ? [] : Array.isArray(field) ? field : [field];
      if (
        exclusions.length > 20 ||
        exclusions.some(
          (value) =>
            typeof value !== 'string' || !value.trim() || value.length > 200,
        )
      )
        throw new BadRequestException('Invalid exclusion filter');
    }

    const values: unknown[] = [
      projectId,
      new Date(from).toISOString(),
      new Date(to).toISOString(),
    ];
    const clauses = [
      'e.project_id=$1',
      'e.received_at >= $2',
      'e.received_at < $3',
    ];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (filters.source) clauses.push(`e.source=${add(filters.source)}`);
    if (filters.event_type)
      clauses.push(`e.event_type=${add(filters.event_type)}`);
    if (filters.severity) {
      if (
        !['INFO', 'WARN', 'ERROR', 'CRITICAL', 'UNSPECIFIED'].includes(
          filters.severity.toUpperCase(),
        )
      )
        throw new BadRequestException('Invalid severity');
      clauses.push(
        filters.severity.toUpperCase() === 'UNSPECIFIED'
          ? 'e.severity IS NULL'
          : `e.severity=${add(filters.severity.toUpperCase())}`,
      );
    }
    for (const [field, column] of [
      [filters.exclude_source, 'source'],
      [filters.exclude_event_type, 'event_type'],
      [filters.exclude_severity, 'severity'],
    ] as const) {
      const exclusions =
        field === undefined ? [] : Array.isArray(field) ? field : [field];
      for (const value of exclusions) {
        if (column === 'severity') {
          const severity = value.toUpperCase();
          if (
            !['INFO', 'WARN', 'ERROR', 'CRITICAL', 'UNSPECIFIED'].includes(
              severity,
            )
          )
            throw new BadRequestException('Invalid severity exclusion');
          clauses.push(
            severity === 'UNSPECIFIED'
              ? 'e.severity IS NOT NULL'
              : `(e.severity IS NULL OR e.severity<>${add(severity)})`,
          );
        } else {
          clauses.push(`lower(e.${column})<>lower(${add(value)})`);
        }
      }
    }
    const terms = parseLogSearch(filters.search ?? '');
    for (const term of terms) {
      const value = term.value;
      if (term.field === 'message')
        clauses.push(
          `e.message ILIKE ${add(`%${escapeLike(value)}%`)} ESCAPE '\\'`,
        );
      else if (term.field === 'tag')
        clauses.push(`${add(value)} = ANY(e.tags)`);
      else if (term.field === 'ip') {
        if (value === 'Unspecified') {
          clauses.push('e.client_ip IS NULL');
          continue;
        }
        if (value.includes('*') && !/^([0-9a-fA-F:.]+)\*$/.test(value))
          throw new BadRequestException('ip supports only a trailing wildcard');
        clauses.push(
          value.endsWith('*')
            ? `e.client_ip LIKE ${add(`${escapeLike(value.slice(0, -1))}%`)} ESCAPE '\\'`
            : `e.client_ip=${add(value)}`,
        );
      } else if (term.field === 'location') {
        clauses.push(
          value === 'Unspecified'
            ? 'e.location IS NULL'
            : `e.location=${add(value)}`,
        );
      } else if (term.field === 'status_code' || term.field === 'duration_ms') {
        if (value === 'Unspecified') {
          clauses.push(`e.${term.field} IS NULL`);
          continue;
        }
        const numeric = Number(value);
        if (
          !Number.isFinite(numeric) ||
          (term.field === 'status_code' && !Number.isInteger(numeric))
        )
          throw new BadRequestException(`Invalid ${term.field} comparison`);
        clauses.push(`e.${term.field} ${term.operator} ${add(numeric)}`);
      } else if (term.field.startsWith('payload.')) {
        const key = add(term.field.slice(8));
        clauses.push(
          `e.raw_payload->>${key}${term.negated ? ' IS DISTINCT FROM ' : '='}${add(value)}`,
        );
      } else {
        const column = term.field === 'severity' ? 'severity' : term.field;
        clauses.push(
          `e.${column}=${add(term.field === 'severity' ? value.toUpperCase() : value)}`,
        );
      }
    }
    const where = clauses.join(' AND ');
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT e.server_event_id AS "eventId",e.request_id AS "requestId",
      e.project_id AS "projectId",e.token_id AS "tokenId",t.name AS "tokenName",
      e.received_at AS "receivedAt",e.event_time AS "timestamp",e.time_source AS "timeSource",
      e.source,e.event_type,e.severity,e.duration_ms,e.status_code,e.message,e.user_id,
      e.client_ip AS "clientIp",e.location,e.tags,e.raw_payload AS "rawPayload",e.processing_status AS "processingStatus"
      FROM log_event_records e LEFT JOIN log_api_tokens t ON t.token_id=e.token_id
      WHERE ${where} ORDER BY e.received_at DESC,e.server_event_id DESC LIMIT ${add(limit + 1)} OFFSET ${add(offset)}`,
      values,
    );

    const summaryValues = values.slice(0, -2);
    const facet = async (expression: string) => {
      const result = await this.db.query<{
        value: string | null;
        count: string;
      }>(
        `SELECT ${expression} AS value,count(*)::text AS count
        FROM log_event_records e WHERE ${where} GROUP BY 1 ORDER BY count(*) DESC NULLS LAST LIMIT 10`,
        summaryValues,
      );
      return result.rows.map((row) => ({
        value: row.value ?? 'Unspecified',
        count: Number(row.count),
      }));
    };
    const rangeSeconds = (to - from) / 1000;
    const bucketSeconds =
      [30, 60, 300, 900, 1800, 3600, 14400, 21600, 86400].find(
        (seconds) => rangeSeconds / seconds <= 80,
      ) ?? 86400;
    const [
      eventTypes,
      statusCodes,
      ips,
      locations,
      sources,
      histogramRows,
      countRows,
    ] = await Promise.all([
      facet('e.event_type'),
      facet('e.status_code::text'),
      facet('e.client_ip'),
      facet('e.location'),
      facet('e.source'),
      this.db.query<{ bucket: Date; severity: string | null; count: string }>(
        `SELECT to_timestamp(floor(extract(epoch FROM e.received_at) / $${summaryValues.length + 1}) * $${summaryValues.length + 1}) AS bucket,
        e.severity,count(*)::text AS count FROM log_event_records e WHERE ${where}
        GROUP BY 1,2 ORDER BY 1`,
        [...summaryValues, bucketSeconds],
      ),
      this.db.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM log_event_records e WHERE ${where}`,
        summaryValues,
      ),
    ]);
    return {
      items: rows.rows.slice(0, limit).map((row) => ({
        ...row,
        receivedAt: new Date(String(row.receivedAt)).toISOString(),
        timestamp: new Date(String(row.timestamp)).toISOString(),
      })),
      nextOffset: rows.rows.length > limit ? offset + limit : null,
      total: Number(countRows.rows[0]?.count ?? 0),
      facets: { eventTypes, statusCodes, ips, locations, sources },
      histogram: histogramRows.rows.map((row) => ({
        bucket: row.bucket.toISOString(),
        severity: row.severity ?? 'Unspecified',
        count: Number(row.count),
      })),
      bucketSeconds,
      filters: terms,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    };
  }
}

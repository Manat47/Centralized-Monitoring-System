import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import type {
  LogClient,
  LogMetadataValue,
  StoredLog,
} from '../../domain/entities/log-event.entity';

export class LogInputError extends Error {}

const MAX_METADATA_KEYS = 16;
const MAX_TAGS = 10;
const SEVERITIES = new Set(['info', 'warning', 'error', 'critical']);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(
  value: unknown,
  field: string,
  max: number,
  required = false,
): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new LogInputError(
      `${field} must be a non-empty string of at most ${max} characters`,
    );
  return value;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new LogInputError(`${field} must be a non-negative finite number`);
  return value;
}

export function normalizeLogEvent(
  value: unknown,
  index: number,
  now = new Date(),
): StoredLog {
  const input = record(value);
  if (!input) throw new LogInputError(`events[${index}] must be an object`);
  const allowed = new Set([
    'event_id',
    'kind',
    'timestamp',
    'source',
    'event_type',
    'message',
    'tenant_id',
    'status_code',
    'duration_ms',
    'user_id',
    'severity',
    'client',
    'metrics',
    'tags',
    'metadata',
  ]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key))
      throw new LogInputError(`events[${index}].${key} is not allowed`);
  }
  if (
    input.kind !== undefined &&
    input.kind !== 'application' &&
    input.kind !== 'activity'
  )
    throw new LogInputError(`events[${index}].kind is invalid`);
  const eventType = string(
    input.event_type,
    `events[${index}].event_type`,
    100,
    true,
  )!;
  const activity =
    input.kind === 'activity' ||
    (input.kind !== 'application' &&
      (eventType.startsWith('auth.') ||
        ['event_id', 'user_id', 'severity', 'client', 'metrics', 'tags'].some(
          (key) => input[key] !== undefined,
        )));
  const timestamp =
    input.timestamp === undefined ? now.toISOString() : input.timestamp;
  const eventTime = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  if (
    !Number.isFinite(eventTime) ||
    eventTime < now.getTime() - 30 * 86400_000 ||
    eventTime > now.getTime() + 5 * 60_000
  )
    throw new LogInputError(
      `events[${index}].timestamp is outside the accepted range`,
    );
  const metrics =
    input.metrics === undefined ? undefined : record(input.metrics);
  if (
    input.metrics !== undefined &&
    (!metrics || Object.keys(metrics).some((key) => key !== 'duration_ms'))
  )
    throw new LogInputError(`events[${index}].metrics is invalid`);
  const duration = optionalNumber(
    input.duration_ms,
    `events[${index}].duration_ms`,
  );
  const metricDuration = optionalNumber(
    metrics?.duration_ms,
    `events[${index}].metrics.duration_ms`,
  );
  if (
    duration !== undefined &&
    metricDuration !== undefined &&
    duration !== metricDuration
  )
    throw new LogInputError(
      `events[${index}].duration_ms conflicts with metrics.duration_ms`,
    );
  const statusCode = input.status_code;
  if (
    statusCode !== undefined &&
    (!Number.isInteger(statusCode) ||
      Number(statusCode) < 0 ||
      Number(statusCode) > 999)
  )
    throw new LogInputError(`events[${index}].status_code is invalid`);
  const severity = string(input.severity, `events[${index}].severity`, 16);
  if (severity && !SEVERITIES.has(severity))
    throw new LogInputError(`events[${index}].severity is invalid`);
  const clientInput =
    input.client === undefined ? undefined : record(input.client);
  if (
    input.client !== undefined &&
    (!clientInput ||
      Object.keys(clientInput).some(
        (key) => !['ip', 'user_agent', 'location', 'device_type'].includes(key),
      ))
  )
    throw new LogInputError(`events[${index}].client is invalid`);
  const client: LogClient | undefined = clientInput
    ? {
        ip: string(clientInput.ip, `events[${index}].client.ip`, 45),
        user_agent: string(
          clientInput.user_agent,
          `events[${index}].client.user_agent`,
          512,
        ),
        location: string(
          clientInput.location,
          `events[${index}].client.location`,
          120,
        ),
        device_type: string(
          clientInput.device_type,
          `events[${index}].client.device_type`,
          60,
        ),
      }
    : undefined;
  if (client?.ip && !isIP(client.ip))
    throw new LogInputError(`events[${index}].client.ip is invalid`);
  let tags: string[] | undefined;
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.length > MAX_TAGS)
      throw new LogInputError(`events[${index}].tags is invalid`);
    tags = input.tags.map((tag, position) =>
      string(tag, `events[${index}].tags[${position}]`, 64, true)!,
    );
    if (new Set(tags).size !== tags.length)
      throw new LogInputError(`events[${index}].tags contains duplicates`);
  }
  let metadata: Record<string, LogMetadataValue> | undefined;
  if (input.metadata !== undefined) {
    const values = record(input.metadata);
    if (!values || Object.keys(values).length > MAX_METADATA_KEYS)
      throw new LogInputError(`events[${index}].metadata is invalid`);
    metadata = {};
    for (const [key, item] of Object.entries(values)) {
      if (
        !key ||
        key.length > 64 ||
        key === 'project_id' ||
        !(
          item === null ||
          typeof item === 'boolean' ||
          (typeof item === 'string' && item.length <= 256) ||
          (typeof item === 'number' && Number.isFinite(item))
        )
      )
        throw new LogInputError(`events[${index}].metadata.${key} is invalid`);
      metadata[key] = item;
    }
  }
  const source =
    string(input.source, `events[${index}].source`, 100, !activity) ??
    eventType.split('.')[0];
  const message =
    string(input.message, `events[${index}].message`, 4000, !activity) ??
    `${eventType}${typeof metadata?.status === 'string' ? ` (${metadata.status})` : ''}`;
  return {
    eventId: randomUUID(),
    ...(input.event_id !== undefined
      ? {
          externalEventId: string(
            input.event_id,
            `events[${index}].event_id`,
            128,
          )!,
        }
      : {}),
    kind: activity ? 'ACTIVITY' : 'APPLICATION',
    timestamp: new Date(eventTime).toISOString(),
    receivedAt: now.toISOString(),
    source,
    event_type: eventType,
    message,
    ...(input.tenant_id !== undefined
      ? {
          tenant_id: string(
            input.tenant_id,
            `events[${index}].tenant_id`,
            100,
          )!,
        }
      : {}),
    ...(statusCode !== undefined ? { status_code: statusCode as number } : {}),
    ...(duration !== undefined || metricDuration !== undefined
      ? { duration_ms: duration ?? metricDuration }
      : {}),
    ...(input.user_id !== undefined
      ? { user_id: string(input.user_id, `events[${index}].user_id`, 128)! }
      : {}),
    ...(severity ? { severity: severity as StoredLog['severity'] } : {}),
    ...(client ? { client } : {}),
    ...(tags ? { tags } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

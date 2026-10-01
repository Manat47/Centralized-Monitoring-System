import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import type {
  JsonValue,
  StoredLog,
} from '../../domain/entities/log-event.entity';

export class LogInputError extends Error {}

const MAX_DEPTH = 8;
const severities = new Set(['INFO', 'WARN', 'ERROR', 'CRITICAL']);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkDepth(value: unknown, path: string, depth = 1): void {
  if (Array.isArray(value)) {
    if (depth > MAX_DEPTH)
      throw new LogInputError(`${path} exceeds JSON depth ${MAX_DEPTH}`);
    value.forEach((item, i) => checkDepth(item, `${path}[${i}]`, depth + 1));
  } else if (object(value)) {
    if (depth > MAX_DEPTH)
      throw new LogInputError(`${path} exceeds JSON depth ${MAX_DEPTH}`);
    Object.entries(value).forEach(([key, item]) =>
      checkDepth(item, `${path}.${key}`, depth + 1),
    );
  } else if (
    value !== null &&
    !['string', 'number', 'boolean'].includes(typeof value)
  )
    throw new LogInputError(`${path} must contain JSON values only`);
}

function text(
  value: unknown,
  path: string,
  max: number,
  required = false,
): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new LogInputError(
      `${path} must be a non-empty string of at most ${max} characters`,
    );
  return value;
}

function number(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new LogInputError(`${path} must be a non-negative finite number`);
  return value;
}

export function normalizeLogEvent(
  value: unknown,
  index: number,
  now = new Date(),
): StoredLog {
  const path = `events[${index}]`;
  if (!object(value)) throw new LogInputError(`${path} must be an object`);
  checkDepth(value, path);
  const source = text(value.source, `${path}.source`, 100, true)!;
  const eventType = text(value.event_type, `${path}.event_type`, 100, true)!;
  const message = text(value.message, `${path}.message`, 4000);
  const userId = text(value.user_id, `${path}.user_id`, 128);
  const reportedSeverity = text(
    value.severity,
    `${path}.severity`,
    16,
  )?.toUpperCase();
  const severityInput =
    reportedSeverity === 'WARNING' ? 'WARN' : reportedSeverity;
  if (severityInput && !severities.has(severityInput))
    throw new LogInputError(`${path}.severity is invalid`);
  const duration = number(value.duration_ms, `${path}.duration_ms`);
  const status = number(value.status_code, `${path}.status_code`);
  if (status !== undefined && (!Number.isInteger(status) || status > 999))
    throw new LogInputError(`${path}.status_code is invalid`);
  if (value.client !== undefined && !object(value.client))
    throw new LogInputError(`${path}.client must be an object`);
  const client = value.client;
  const ip = text(client?.ip, `${path}.client.ip`, 45);
  if (ip && !isIP(ip)) throw new LogInputError(`${path}.client.ip is invalid`);
  const location = text(client?.location, `${path}.client.location`, 120);
  const device = text(client?.device_type, `${path}.client.device_type`, 60);
  let tags: string[] | undefined;
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.length > 10)
      throw new LogInputError(
        `${path}.tags must be an array of at most 10 strings`,
      );
    tags = value.tags.map((tag, i) =>
      text(tag, `${path}.tags[${i}]`, 64, true)!,
    );
  }
  let timestamp = now.toISOString();
  if (value.timestamp !== undefined) {
    const input = text(value.timestamp, `${path}.timestamp`, 64, true)!;
    const parsed = Date.parse(input);
    if (
      !Number.isFinite(parsed) ||
      parsed < now.getTime() - 30 * 86400_000 ||
      parsed > now.getTime() + 5 * 60_000
    )
      throw new LogInputError(
        `${path}.timestamp is outside the accepted range`,
      );
    timestamp = new Date(parsed).toISOString();
  }
  return {
    eventId: randomUUID(),
    requestId: '',
    tokenId: '',
    timestamp,
    receivedAt: now.toISOString(),
    timeSource: value.timestamp === undefined ? 'received' : 'client',
    source,
    event_type: eventType,
    ...(message ? { message } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(severityInput
      ? { severity: severityInput as StoredLog['severity'] }
      : {}),
    ...(duration !== undefined ? { duration_ms: duration } : {}),
    ...(status !== undefined ? { status_code: status } : {}),
    ...(client
      ? {
          client: {
            ...(ip ? { ip } : {}),
            ...(location ? { location } : {}),
            ...(device ? { device_type: device } : {}),
          },
        }
      : {}),
    ...(tags ? { tags } : {}),
    rawPayload: value as Record<string, JsonValue>,
  };
}

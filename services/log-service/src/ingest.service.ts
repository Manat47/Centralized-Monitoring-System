import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataStore } from './data.store';
import { LogInfrastructure, StoredLog } from './log.infrastructure';

type InputLog = Record<string, unknown>;

@Injectable()
export class IngestService {
  constructor(
    private readonly db: DataStore,
    private readonly infra: LogInfrastructure,
  ) {}

  async authenticate(authorization: string | undefined) {
    const match = /^Bearer (prj_live_[A-Za-z0-9_-]+)$/.exec(
      authorization ?? '',
    );
    if (!match) {
      await this.infra.recordRequest(null);
      throw new UnauthorizedException('Project token is required');
    }
    const tokenHash = this.infra.tokenHash(match[1]);
    const cacheKey = `log:token:${tokenHash}`;
    if (await this.infra.redis.exists(`log:revoked:${tokenHash}`)) {
      await this.infra.recordRequest(null);
      throw new UnauthorizedException('Invalid project token');
    }
    let cached = await this.infra.redis.get(cacheKey);
    if (!cached) {
      const result = await this.db.query<{
        project_id: string;
        token_id: string;
      }>(
        `SELECT project_id,token_id FROM log_api_tokens WHERE token_hash=$1 AND revoked_at IS NULL`,
        [tokenHash],
      );
      if (!result.rows[0]) {
        await this.infra.recordRequest(null);
        throw new UnauthorizedException('Invalid project token');
      }
      cached = JSON.stringify(result.rows[0]);
      await this.infra.redis.set(cacheKey, cached, 'EX', 300);
      const stillActive = await this.db.query(
        'SELECT 1 FROM log_api_tokens WHERE token_hash=$1 AND revoked_at IS NULL',
        [tokenHash],
      );
      if (!stillActive.rowCount) {
        await this.infra.redis.del(cacheKey);
        await this.infra.recordRequest(null);
        throw new UnauthorizedException('Invalid project token');
      }
    }
    if (await this.infra.redis.exists(`log:revoked:${tokenHash}`)) {
      await this.infra.recordRequest(null);
      throw new UnauthorizedException('Invalid project token');
    }
    const token = JSON.parse(cached) as {
      project_id: string;
      token_id: string;
    };
    await this.infra.recordRequest(token.project_id);
    const firstUseInMinute = await this.infra.redis.set(
      `log:lastused:${token.token_id}`,
      '1',
      'EX',
      60,
      'NX',
    );
    if (firstUseInMinute === 'OK') {
      await this.db.query(
        'UPDATE log_api_tokens SET last_used_at=now() WHERE token_id=$1',
        [token.token_id],
      );
    }
    return token.project_id;
  }

  private validateEvent(input: InputLog, index: number): StoredLog {
    const allowed = new Set([
      'timestamp',
      'source',
      'event_type',
      'message',
      'tenant_id',
      'status_code',
      'duration_ms',
      'metadata',
    ]);
    for (const key of Object.keys(input)) {
      if (!allowed.has(key))
        throw new BadRequestException(`events[${index}].${key} is not allowed`);
    }
    const required = (key: string, max: number) => {
      const value = input[key];
      if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new BadRequestException(
          `events[${index}].${key} must be a non-empty string of at most ${max} characters`,
        );
      return value;
    };
    const now = Date.now();
    const timestamp =
      input.timestamp === undefined
        ? new Date(now).toISOString()
        : input.timestamp;
    const time = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
    if (
      !Number.isFinite(time) ||
      time < now - 30 * 86400_000 ||
      time > now + 5 * 60_000
    )
      throw new BadRequestException(
        `events[${index}].timestamp is outside the accepted range`,
      );
    if (
      input.tenant_id !== undefined &&
      (typeof input.tenant_id !== 'string' || input.tenant_id.length > 100)
    )
      throw new BadRequestException(`events[${index}].tenant_id is invalid`);
    if (
      input.status_code !== undefined &&
      (!Number.isInteger(input.status_code) ||
        Number(input.status_code) < 0 ||
        Number(input.status_code) > 999)
    )
      throw new BadRequestException(`events[${index}].status_code is invalid`);
    if (
      input.duration_ms !== undefined &&
      (typeof input.duration_ms !== 'number' ||
        !Number.isFinite(input.duration_ms) ||
        input.duration_ms < 0)
    )
      throw new BadRequestException(`events[${index}].duration_ms is invalid`);
    let metadata: Record<string, string | number | boolean> | undefined;
    if (input.metadata !== undefined) {
      if (
        !input.metadata ||
        typeof input.metadata !== 'object' ||
        Array.isArray(input.metadata)
      )
        throw new BadRequestException(
          `events[${index}].metadata must be an object`,
        );
      const entries = Object.entries(input.metadata);
      if (entries.length > 16)
        throw new BadRequestException(
          `events[${index}].metadata has too many keys`,
        );
      metadata = {};
      for (const [key, value] of entries) {
        if (
          !key ||
          key.length > 64 ||
          key === 'project_id' ||
          !(
            typeof value === 'boolean' ||
            (typeof value === 'string' && value.length <= 256) ||
            (typeof value === 'number' && Number.isFinite(value))
          )
        )
          throw new BadRequestException(
            `events[${index}].metadata.${key} is invalid`,
          );
        metadata[key] = value;
      }
    }
    return {
      eventId: randomUUID(),
      timestamp: new Date(time).toISOString(),
      source: required('source', 100),
      event_type: required('event_type', 100),
      message: required('message', 4000),
      ...(input.tenant_id !== undefined ? { tenant_id: input.tenant_id } : {}),
      ...(input.status_code !== undefined
        ? { status_code: input.status_code as number }
        : {}),
      ...(input.duration_ms !== undefined
        ? { duration_ms: input.duration_ms }
        : {}),
      ...(metadata ? { metadata } : {}),
    };
  }

  async ingest(
    projectId: string,
    body: unknown,
    idempotencyKey?: string,
    query: Record<string, unknown> = {},
  ) {
    if (Object.keys(query).length)
      throw new BadRequestException('Query parameters are not accepted');
    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'events' in body &&
      Object.keys(body).some((key) => key !== 'events')
    )
      throw new BadRequestException(
        'Only events is allowed in a batch envelope',
      );
    const input = Array.isArray(body)
      ? body
      : body && typeof body === 'object' && 'events' in body
        ? body.events
        : [body];
    if (!Array.isArray(input) || input.length < 1 || input.length > 500)
      throw new BadRequestException('Request must contain 1–500 events');
    if (
      idempotencyKey &&
      (idempotencyKey.length > 128 || !/^[\x21-\x7e]+$/.test(idempotencyKey))
    )
      throw new BadRequestException('Invalid Idempotency-Key');
    const events = input.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new BadRequestException(`events[${index}] must be an object`);
      return this.validateEvent(item as InputLog, index);
    });
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    if (idempotencyKey) {
      await this.db.query(
        `DELETE FROM log_idempotency WHERE project_id=$1 AND idempotency_key=$2
        AND created_at < now() - interval '24 hours'`,
        [projectId, idempotencyKey],
      );
      const inserted = await this.db.query(
        `INSERT INTO log_idempotency
        (project_id,idempotency_key,payload_hash,status) VALUES ($1,$2,$3,'PENDING')
        ON CONFLICT DO NOTHING RETURNING status`,
        [projectId, idempotencyKey, payloadHash],
      );
      if (!inserted.rowCount) {
        const existing = await this.db.query<{
          status: string;
          payload_hash: string;
          accepted_count: number;
        }>(
          'SELECT status,payload_hash,accepted_count FROM log_idempotency WHERE project_id=$1 AND idempotency_key=$2',
          [projectId, idempotencyKey],
        );
        if (existing.rows[0]?.payload_hash !== payloadHash)
          throw new ConflictException(
            'Idempotency-Key was used with different content',
          );
        if (existing.rows[0]?.status === 'ACCEPTED')
          return {
            acceptedRecords: existing.rows[0].accepted_count,
            duplicate: true,
          };
        throw new ConflictException(
          'Request with this Idempotency-Key is in progress',
        );
      }
    }
    const acceptedAt = new Date();
    const batchId = randomUUID();
    try {
      await this.infra.publishLogs({
        batchId,
        projectId,
        acceptedAt: acceptedAt.toISOString(),
        idempotencyKey,
        events,
      });
    } catch {
      if (idempotencyKey)
        await this.db.query(
          `DELETE FROM log_idempotency
        WHERE project_id=$1 AND idempotency_key=$2 AND status='PENDING'`,
          [projectId, idempotencyKey],
        );
      throw new ServiceUnavailableException('Log queue is unavailable');
    }
    await this.db.recordAccepted(
      batchId,
      projectId,
      acceptedAt.toISOString(),
      events.length,
      idempotencyKey,
    );
    return { acceptedRecords: events.length, duplicate: false };
  }
}

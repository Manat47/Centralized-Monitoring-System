import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataStore } from './data.store';
import { LogInfrastructure } from './log.infrastructure';
import {
  LogInputError,
  normalizeLogEvent,
} from './log-events/application/services/log-event-normalizer.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
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
    const rpm = await this.infra.recordRequest(token.project_id);
    if (rpm > this.infra.rateLimitRpm) {
      await this.infra.recordRejection(
        token.project_id,
        429,
        'Project request rate limit exceeded',
      );
      const exceeded = new HttpException(
        'Project request rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      Object.assign(exceeded, {
        projectId: token.project_id,
        tokenId: token.token_id,
      });
      throw exceeded;
    }
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
    return { projectId: token.project_id, tokenId: token.token_id };
  }

  async ingest(
    projectId: string,
    body: unknown,
    idempotencyKey?: string,
    query: Record<string, unknown> = {},
    tokenId = '',
    requestId: string = randomUUID(),
  ) {
    try {
      return await this.ingestValidated(
        projectId,
        body,
        idempotencyKey,
        query,
        tokenId,
        requestId,
      );
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 503;
      const reason =
        error instanceof HttpException
          ? error.message
          : 'Ingestion unavailable';
      await this.infra
        .recordRejection(projectId, status, reason)
        .catch(() => undefined);
      throw error;
    }
  }

  private async ingestValidated(
    projectId: string,
    body: unknown,
    idempotencyKey: string | undefined,
    query: Record<string, unknown>,
    tokenId: string,
    requestId: string,
  ) {
    if (Object.keys(query).length)
      throw new BadRequestException('Query parameters are not accepted');
    const envelope =
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      Object.keys(body).length === 1 &&
      Array.isArray((body as Record<string, unknown>).events);
    const input = Array.isArray(body)
      ? body
      : envelope
        ? (body as { events: unknown[] }).events
        : [body];
    if (!Array.isArray(input) || input.length < 1 || input.length > 500)
      throw new BadRequestException('Request must contain 1–500 events');
    if (
      idempotencyKey &&
      (idempotencyKey.length > 128 || !/^[\x21-\x7e]+$/.test(idempotencyKey))
    )
      throw new BadRequestException('Invalid Idempotency-Key');
    const receivedAt = new Date();
    const events = input.map((item, index) => {
      try {
        return {
          ...normalizeLogEvent(item, index, receivedAt),
          requestId,
          tokenId,
        };
      } catch (error) {
        if (error instanceof LogInputError)
          throw new BadRequestException(error.message);
        throw error;
      }
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
          batch_id: string | null;
        }>(
          'SELECT status,payload_hash,accepted_count,batch_id FROM log_idempotency WHERE project_id=$1 AND idempotency_key=$2',
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
            batchId: existing.rows[0].batch_id,
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
        tokenId,
        requestId,
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
    try {
      await this.db.recordAccepted(
        batchId,
        projectId,
        acceptedAt.toISOString(),
        events.length,
        idempotencyKey,
        requestId,
      );
    } catch (error) {
      // RabbitMQ has already confirmed the durable batch. The worker retries
      // this ledger write using its unique batch ID.
      this.logger.warn(`Accepted batch ledger will retry: ${String(error)}`);
    }
    try {
      await this.infra.recordAggregate(
        projectId,
        'accepted_records',
        events.length,
      );
    } catch (error) {
      this.logger.warn(`Could not update accepted metric: ${String(error)}`);
    }
    return { acceptedRecords: events.length, duplicate: false, batchId };
  }

  async batchStatus(authorization: string | undefined, batchId: string) {
    const { projectId } = await this.authenticate(authorization);
    const status = await this.db.batchStatus(projectId, batchId);
    if (!status) throw new NotFoundException('Batch not found');
    return status;
  }
}

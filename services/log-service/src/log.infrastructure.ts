import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import * as amqp from 'amqplib';
import type {
  Channel,
  ChannelModel,
  ConfirmChannel,
  ConsumeMessage,
} from 'amqplib';
import Redis from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';
import { DataStore } from './data.store';
import type { StoredLog } from './log-events/domain/entities/log-event.entity';
import { ProcessActivityEventUseCase } from './log-events/application/use-cases/process-activity-event.use-case';
import type { RequestReceipt } from './log-events/domain/repositories/activity.repository';

export interface QueuedLogs {
  batchId: string;
  projectId: string;
  tokenId: string;
  requestId: string;
  acceptedAt: string;
  idempotencyKey?: string;
  events: StoredLog[];
}

const LOG_QUEUE = 'app_logs_queue';
const DEAD_LETTER_QUEUE = 'app_logs_dead_letter';
const RETRY_QUEUE = 'app_logs_retry';
const LOG_EXCHANGE = 'app_logs';
const LOG_ROUTING_KEY = 'logs.events';
const REQUEST_QUEUE = 'app_log_requests_queue';
const REQUEST_RETRY_QUEUE = 'app_log_requests_retry';
const REQUEST_DEAD_LETTER_QUEUE = 'app_log_requests_dead_letter';
const REQUEST_ROUTING_KEY = 'logs.requests';
const PENDING_RECEIPTS = 'log:request-receipts:pending';
const PROCESSING_RECEIPTS = 'log:request-receipts:processing';

@Injectable()
export class LogInfrastructure implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogInfrastructure.name);
  readonly redis: Redis;
  readonly influx: InfluxDB;
  readonly influxOrg: string;
  readonly influxBucket: string;
  private connection?: ChannelModel;
  private publisher?: ConfirmChannel;
  private consumer?: Channel;
  private requestConsumer?: Channel;
  private metricTimer?: ReturnType<typeof setInterval>;
  private receiptTimer?: ReturnType<typeof setInterval>;
  private flushingReceipts = false;

  readonly rateLimitRpm = Number(process.env.LOG_RATE_LIMIT_RPM ?? 600);

  constructor(
    private readonly db: DataStore,
    private readonly processActivity: ProcessActivityEventUseCase,
  ) {
    if (!Number.isInteger(this.rateLimitRpm) || this.rateLimitRpm < 1)
      throw new Error('LOG_RATE_LIMIT_RPM must be a positive integer');
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    const url = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    this.influxOrg = process.env.INFLUXDB_ORG ?? '';
    this.influxBucket =
      process.env.INFLUXDB_LOG_METRICS_BUCKET ?? 'log_metrics';
    if (!url || !token || !this.influxOrg)
      throw new Error('InfluxDB configuration is required');
    this.influx = new InfluxDB({ url, token });
  }

  async onModuleInit() {
    await this.redis.connect();
    await this.ensureBucket();
    await this.flushMetrics(true);
    this.metricTimer = setInterval(() => {
      void this.flushMetrics().catch((error: unknown) =>
        this.logger.warn(`Metric flush will retry: ${String(error)}`),
      );
    }, 15_000);
    if (!process.env.RABBITMQ_URL) throw new Error('RABBITMQ_URL is required');
    this.connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.publisher = await this.connection.createConfirmChannel();
    await this.publisher.assertExchange(LOG_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.publisher.assertQueue(LOG_QUEUE, { durable: true });
    await this.publisher.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await this.publisher.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': 2000,
        'x-dead-letter-exchange': LOG_EXCHANGE,
        'x-dead-letter-routing-key': LOG_ROUTING_KEY,
      },
    });
    await this.publisher.bindQueue(LOG_QUEUE, LOG_EXCHANGE, LOG_ROUTING_KEY);
    await this.publisher.assertQueue(REQUEST_QUEUE, { durable: true });
    await this.publisher.assertQueue(REQUEST_DEAD_LETTER_QUEUE, {
      durable: true,
    });
    await this.publisher.assertQueue(REQUEST_RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': 2000,
        'x-dead-letter-exchange': LOG_EXCHANGE,
        'x-dead-letter-routing-key': REQUEST_ROUTING_KEY,
      },
    });
    await this.publisher.bindQueue(
      REQUEST_QUEUE,
      LOG_EXCHANGE,
      REQUEST_ROUTING_KEY,
    );
    await this.publisher.assertQueue(
      process.env.RABBITMQ_AUDIT_QUEUE ?? 'audit_events',
      { durable: true },
    );
    this.consumer = await this.connection.createChannel();
    // One worker preserves receive order for rolling detection windows on this node.
    await this.consumer.prefetch(1);
    await this.consumer.consume(
      LOG_QUEUE,
      (message) => {
        void this.consume(message);
      },
      { noAck: false },
    );
    this.requestConsumer = await this.connection.createChannel();
    await this.requestConsumer.prefetch(10);
    await this.requestConsumer.consume(
      REQUEST_QUEUE,
      (message) => {
        void this.consumeRequest(message);
      },
      { noAck: false },
    );
    this.receiptTimer = setInterval(() => {
      void this.flushReceiptQueue().catch((error: unknown) =>
        this.logger.error('Request receipt publish will retry', error),
      );
    }, 2000);
    void this.flushReceiptQueue().catch((error: unknown) =>
      this.logger.error('Request receipt publish will retry', error),
    );
  }

  private async ensureBucket() {
    const base = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    if (!base || !token) throw new Error('InfluxDB configuration is required');
    const headers = { Authorization: `Token ${token}` };
    const existing = await fetch(
      `${base}/api/v2/buckets?name=${encodeURIComponent(this.influxBucket)}`,
      { headers },
    );
    if (!existing.ok) throw new Error('Cannot inspect InfluxDB buckets');
    const found = (await existing.json()) as {
      buckets?: { id: string; retentionRules?: { everySeconds: number }[] }[];
    };
    if (found.buckets?.length) {
      const bucket = found.buckets[0];
      if (bucket.retentionRules?.[0]?.everySeconds !== 30 * 86400) {
        const updated = await fetch(`${base}/api/v2/buckets/${bucket.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            retentionRules: [{ type: 'expire', everySeconds: 30 * 86400 }],
          }),
        });
        if (!updated.ok) throw new Error('Cannot set 30-day log retention');
      }
      return;
    }
    const orgs = await fetch(
      `${base}/api/v2/orgs?org=${encodeURIComponent(this.influxOrg)}`,
      { headers },
    );
    if (!orgs.ok) throw new Error('Cannot inspect InfluxDB organization');
    const orgData = (await orgs.json()) as { orgs?: { id: string }[] };
    const orgID = orgData.orgs?.[0]?.id;
    if (!orgID) throw new Error('InfluxDB organization not found');
    const created = await fetch(`${base}/api/v2/buckets`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgID,
        name: this.influxBucket,
        retentionRules: [{ type: 'expire', everySeconds: 30 * 86400 }],
      }),
    });
    if (!created.ok && created.status !== 422)
      throw new Error('Cannot create InfluxDB log bucket');
  }

  private async confirmPublish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    headers?: Record<string, unknown>,
  ) {
    const channel = this.publisher;
    if (!channel) throw new Error('RabbitMQ is unavailable');
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        Buffer.isBuffer(payload)
          ? payload
          : Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json', headers },
        (error) =>
          error
            ? reject(error instanceof Error ? error : new Error(String(error)))
            : resolve(),
      );
    });
  }

  async publishLogs(payload: QueuedLogs) {
    await this.confirmPublish(LOG_EXCHANGE, LOG_ROUTING_KEY, payload);
  }

  async enqueueRequestReceipt(receipt: RequestReceipt): Promise<void> {
    try {
      await this.redis.lpush(PENDING_RECEIPTS, JSON.stringify(receipt));
    } catch (error) {
      this.logger.warn(
        `Redis receipt staging unavailable; publishing directly: ${String(error)}`,
      );
      await this.confirmPublish(LOG_EXCHANGE, REQUEST_ROUTING_KEY, receipt);
      return;
    }
    void this.flushReceiptQueue().catch((error: unknown) =>
      this.logger.error('Request receipt publish will retry', error),
    );
  }

  private async flushReceiptQueue(): Promise<void> {
    if (this.flushingReceipts) return;
    this.flushingReceipts = true;
    try {
      for (;;) {
        const pending =
          (await this.redis.lindex(PROCESSING_RECEIPTS, 0)) ??
          (await this.redis.rpoplpush(PENDING_RECEIPTS, PROCESSING_RECEIPTS));
        if (!pending) break;
        await this.confirmPublish(
          LOG_EXCHANGE,
          REQUEST_ROUTING_KEY,
          JSON.parse(pending),
        );
        await this.redis.lrem(PROCESSING_RECEIPTS, 1, pending);
      }
    } finally {
      this.flushingReceipts = false;
    }
  }

  async publishAudit(payload: Record<string, unknown>) {
    await this.confirmPublish(
      '',
      process.env.RABBITMQ_AUDIT_QUEUE ?? 'audit_events',
      {
        pattern: 'audit.event',
        data: {
          eventId: randomUUID(),
          schemaVersion: 1,
          sourceService: 'log-service',
          occurredAt: new Date().toISOString(),
          result: 'SUCCESS',
          ...payload,
        },
      },
    );
  }

  async recordRequest(projectId: string | null): Promise<number> {
    const key = projectId ? `log:rpm:${projectId}` : 'log:rpm:invalid';
    const now = Date.now();
    const rpm = Number(
      await this.redis.eval(
        `redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
       redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])
       redis.call('EXPIRE', KEYS[1], 120)
       return redis.call('ZCARD', KEYS[1])`,
        1,
        key,
        now,
        `${now}:${randomUUID()}`,
        now - 60_000,
      ),
    );
    await this.recordAggregate(projectId, 'requests');
    return rpm;
  }

  async recordAggregate(
    projectId: string | null,
    field: string,
    amount = 1,
  ): Promise<void> {
    const minute = Math.floor(Date.now() / 60_000) * 60_000;
    const key = `log:metric:${minute}:${projectId ?? 'invalid'}`;
    await this.redis.hincrby(key, field, amount);
    await this.redis.expire(key, 31 * 86400);
  }

  async recordRejection(
    projectId: string,
    status: number,
    reason: string,
  ): Promise<void> {
    const key = `log:rejections:${projectId}`;
    await this.redis.lpush(
      key,
      JSON.stringify({ at: new Date().toISOString(), status, reason }),
    );
    await this.redis.ltrim(key, 0, 19);
    await this.redis.expire(key, 86400);
  }

  async recentRejections(
    projectId: string,
  ): Promise<{ at: string; status: number; reason: string }[]> {
    const rows = await this.redis.lrange(`log:rejections:${projectId}`, 0, 19);
    return rows.map(
      (item) =>
        JSON.parse(item) as { at: string; status: number; reason: string },
    );
  }

  private async flushMetrics(all = false): Promise<void> {
    const writer = this.influx.getWriteApi(
      this.influxOrg,
      this.influxBucket,
      'ms',
    );
    let cursor = '0';
    try {
      do {
        const minute = Math.floor(Date.now() / 60_000) * 60_000;
        const patterns = all
          ? ['log:metric:*']
          : [`log:metric:${minute}:*`, `log:metric:${minute - 60_000}:*`];
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          patterns[0],
          'COUNT',
          200,
        );
        cursor = next;
        const pending = all
          ? keys
          : [...keys, ...(await this.redis.keys(patterns[1]))];
        for (const key of pending) {
          const parts = /^log:metric:(\d+):(.+)$/.exec(key);
          if (!parts) continue;
          const fields = await this.redis.hgetall(key);
          if (!Object.keys(fields).length) continue;
          const point = new Point('log_ingestion_minute')
            .tag('project_id', parts[2])
            .timestamp(new Date(Number(parts[1])));
          for (const [field, count] of Object.entries(fields))
            point.intField(field, Number(count));
          writer.writePoint(point);
        }
      } while (cursor !== '0');
      await writer.close();
    } catch (error) {
      try {
        await writer.close();
      } catch {
        /* keep Redis counters for retry */
      }
      throw error;
    }
  }

  async getRpm(projectId: string): Promise<number> {
    const key = `log:rpm:${projectId}`;
    const now = Date.now();
    await this.redis.zremrangebyscore(key, 0, now - 60_000);
    return this.redis.zcard(key);
  }

  async getInvalidRpm(): Promise<number> {
    const key = 'log:rpm:invalid';
    await this.redis.zremrangebyscore(key, 0, Date.now() - 60_000);
    return this.redis.zcard(key);
  }

  async ready(): Promise<boolean> {
    if (!this.publisher || !this.consumer) return false;
    const [db, redis, influx] = await Promise.all([
      this.db.query('SELECT 1'),
      this.redis.ping(),
      fetch(`${process.env.INFLUXDB_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      }),
      this.publisher.checkQueue(LOG_QUEUE),
    ]);
    return Boolean(db.rowCount) && redis === 'PONG' && influx.ok;
  }

  private async consume(message: ConsumeMessage | null) {
    if (!message || !this.consumer) return;
    try {
      let payload: QueuedLogs;
      try {
        payload = JSON.parse(message.content.toString()) as QueuedLogs;
        if (
          !payload.batchId ||
          !payload.projectId ||
          !payload.requestId ||
          !payload.acceptedAt ||
          !Array.isArray(payload.events) ||
          !payload.events.length ||
          payload.events.some(
            (event) =>
              !event.eventId ||
              !event.timestamp ||
              !event.source ||
              !event.event_type ||
              !event.rawPayload,
          )
        )
          throw new Error('Invalid queued log payload');
      } catch (error) {
        await this.confirmPublish('', DEAD_LETTER_QUEUE, {
          reason: String(error),
          raw: message.content.toString('base64'),
        });
        this.consumer.ack(message);
        return;
      }
      for (const event of payload.events) {
        await this.processActivity.execute(payload.projectId, event);
      }
      await this.db.recordAccepted(
        payload.batchId,
        payload.projectId,
        payload.acceptedAt,
        payload.events.length,
        payload.idempotencyKey,
        payload.requestId,
      );
      await this.db.markBatchStored(payload.batchId);
      this.consumer.ack(message);
    } catch (error) {
      this.logger.error('Failed to persist queued logs; retrying', error);
      const priorAttempts = Number(message.properties.headers?.retryCount ?? 0);
      try {
        if (priorAttempts >= 10) {
          let failed: Partial<QueuedLogs> = {};
          try {
            failed = JSON.parse(
              message.content.toString(),
            ) as Partial<QueuedLogs>;
          } catch {
            /* malformed payload has no batch to track */
          }
          if (
            failed.batchId &&
            failed.projectId &&
            failed.acceptedAt &&
            Array.isArray(failed.events)
          ) {
            await this.db.recordAccepted(
              failed.batchId,
              failed.projectId,
              failed.acceptedAt,
              failed.events.length,
              failed.idempotencyKey,
              failed.requestId,
            );
            await this.db.markBatchFailed(
              failed.batchId,
              'Log processing failed after retries',
            );
          }
          await this.confirmPublish('', DEAD_LETTER_QUEUE, {
            reason: String(error),
            raw: message.content.toString('base64'),
          });
        } else {
          await this.confirmPublish('', RETRY_QUEUE, message.content, {
            retryCount: priorAttempts + 1,
          });
        }
        this.consumer?.ack(message);
      } catch (publishError) {
        this.logger.error(
          'Could not publish retry or dead-letter message',
          publishError,
        );
        this.consumer?.nack(message, false, true);
      }
    }
  }

  private async consumeRequest(message: ConsumeMessage | null) {
    if (!message || !this.requestConsumer) return;
    try {
      const receipt = JSON.parse(message.content.toString()) as RequestReceipt;
      if (
        !receipt.requestId ||
        !receipt.receivedAt ||
        !Number.isInteger(receipt.httpStatus)
      )
        throw new Error('Invalid request receipt');
      await this.processActivity.executeRequest(receipt);
      this.requestConsumer.ack(message);
    } catch (error) {
      this.logger.error('Failed to persist request receipt; retrying', error);
      const attempts = Number(message.properties.headers?.retryCount ?? 0);
      try {
        if (attempts >= 10)
          await this.confirmPublish('', REQUEST_DEAD_LETTER_QUEUE, {
            reason: String(error),
            raw: message.content.toString('base64'),
          });
        else
          await this.confirmPublish('', REQUEST_RETRY_QUEUE, message.content, {
            retryCount: attempts + 1,
          });
        this.requestConsumer?.ack(message);
      } catch (publishError) {
        this.logger.error(
          'Could not publish request receipt retry',
          publishError,
        );
        this.requestConsumer?.nack(message, false, true);
      }
    }
  }

  tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async onModuleDestroy() {
    if (this.metricTimer) clearInterval(this.metricTimer);
    if (this.receiptTimer) clearInterval(this.receiptTimer);
    await this.flushMetrics().catch(() => undefined);
    await this.consumer?.close();
    await this.requestConsumer?.close();
    await this.publisher?.close();
    await this.connection?.close();
    this.redis.disconnect();
  }
}

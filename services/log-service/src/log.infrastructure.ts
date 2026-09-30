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

export interface QueuedLogs {
  batchId: string;
  projectId: string;
  acceptedAt: string;
  idempotencyKey?: string;
  events: StoredLog[];
}

const LOG_QUEUE = 'app_logs_queue';
const DEAD_LETTER_QUEUE = 'app_logs_dead_letter';
const RETRY_QUEUE = 'app_logs_retry';
const LOG_EXCHANGE = 'app_logs';
const LOG_ROUTING_KEY = 'logs.events';

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
    this.influxBucket = process.env.INFLUXDB_LOG_BUCKET ?? 'app_logs';
    if (!url || !token || !this.influxOrg)
      throw new Error('InfluxDB configuration is required');
    this.influx = new InfluxDB({ url, token });
  }

  async onModuleInit() {
    await this.redis.connect();
    await this.ensureBucket();
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
    return Number(
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
          !payload.acceptedAt ||
          !Array.isArray(payload.events) ||
          !payload.events.length ||
          payload.events.some(
            (event) =>
              !event.eventId ||
              !event.timestamp ||
              !event.source ||
              !event.event_type ||
              !event.message,
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
      const writer = this.influx.getWriteApi(
        this.influxOrg,
        this.influxBucket,
        'ns',
      );
      for (const event of payload.events) {
        if (!event.receivedAt) event.receivedAt = payload.acceptedAt;
        if (!event.kind) event.kind = 'APPLICATION';
        if (event.kind === 'ACTIVITY') {
          const offset = parseInt(
            event.eventId.replaceAll('-', '').slice(0, 8),
            16,
          );
          const storageNs =
            BigInt(Date.parse(event.receivedAt)) * 1_000_000n + BigInt(offset);
          writer.writePoint(
            new Point('activity_log')
              .tag('project_id', payload.projectId)
              .stringField('event_id', event.eventId)
              .stringField('occurred_at', event.timestamp)
              .stringField('received_at', event.receivedAt)
              .stringField('payload', JSON.stringify(event))
              .timestamp(storageNs.toString()),
          );
          continue;
        }
        const point = new Point('app_log')
          .tag('project_id', payload.projectId)
          .tag('event_id', event.eventId)
          .tag('source', event.source)
          .tag('event_type', event.event_type)
          .stringField('message', event.message)
          .timestamp(new Date(event.timestamp));
        if (event.tenant_id) point.stringField('tenant_id', event.tenant_id);
        if (event.status_code !== undefined)
          point.intField('status_code', event.status_code);
        if (event.duration_ms !== undefined)
          point.floatField('duration_ms', event.duration_ms);
        if (event.metadata)
          point.stringField('metadata', JSON.stringify(event.metadata));
        writer.writePoint(point);
      }
      await writer.close();
      for (const event of payload.events) {
        if (!event.receivedAt) event.receivedAt = payload.acceptedAt;
        if (!event.kind) event.kind = 'APPLICATION';
        await this.processActivity.execute(payload.projectId, event);
      }
      await this.db.recordAccepted(
        payload.batchId,
        payload.projectId,
        payload.acceptedAt,
        payload.events.length,
        payload.idempotencyKey,
      );
      this.consumer.ack(message);
    } catch (error) {
      this.logger.error('Failed to persist queued logs; retrying', error);
      const priorAttempts = Number(message.properties.headers?.retryCount ?? 0);
      try {
        if (priorAttempts >= 10) {
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

  tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async onModuleDestroy() {
    await this.consumer?.close();
    await this.publisher?.close();
    await this.connection?.close();
    this.redis.disconnect();
  }
}

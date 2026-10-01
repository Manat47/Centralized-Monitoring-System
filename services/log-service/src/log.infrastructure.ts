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

export interface StoredLog {
  eventId: string;
  timestamp: string;
  source: string;
  event_type: string;
  message: string;
  tenant_id?: string;
  status_code?: number;
  duration_ms?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface QueuedLogs {
  batchId: string;
  projectId: string;
  acceptedAt: string;
  idempotencyKey?: string;
  events: StoredLog[];
}

const LOG_QUEUE = 'app_logs_queue';
const DEAD_LETTER_QUEUE = 'app_logs_dead_letter';
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

  constructor(private readonly db: DataStore) {
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
    await this.publisher.bindQueue(LOG_QUEUE, LOG_EXCHANGE, LOG_ROUTING_KEY);
    await this.publisher.assertQueue(
      process.env.RABBITMQ_AUDIT_QUEUE ?? 'audit_events',
      { durable: true },
    );
    this.consumer = await this.connection.createChannel();
    await this.consumer.prefetch(5);
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
  ) {
    const channel = this.publisher;
    if (!channel) throw new Error('RabbitMQ is unavailable');
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json' },
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

  async recordRequest(projectId: string | null) {
    const key = projectId ? `log:rpm:${projectId}` : 'log:rpm:invalid';
    const now = Date.now();
    const pipeline = this.redis.multi();
    pipeline.zadd(key, now, `${now}:${randomUUID()}`);
    pipeline.zremrangebyscore(key, 0, now - 60_000);
    pipeline.expire(key, 120);
    await pipeline.exec();
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
        'ms',
      );
      for (const event of payload.events) {
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.consumer?.nack(message, false, true);
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

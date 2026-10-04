import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type {
  Channel,
  ChannelModel,
  ConfirmChannel,
  ConsumeMessage,
} from 'amqplib';
import {
  matchLogFinding,
  type IncomingLog,
  type LogFindingRule,
} from './log-finding-matcher';

const SOURCE_EXCHANGE = 'app_logs';
const SOURCE_QUEUE = 'log_finding_ingestion';
const CANDIDATE_EXCHANGE = 'log.finding.events';
const CANDIDATE_QUEUE = 'log_finding_events';

interface LogBatch {
  projectId: string;
  events: IncomingLog[];
}

@Injectable()
export class LogFindingStream implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogFindingStream.name);
  private connection?: ChannelModel;
  private publisher?: ConfirmChannel;
  private consumer?: Channel;
  private rules: LogFindingRule[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) throw new Error('RABBITMQ_URL is not defined');
    this.connection = await amqp.connect(url);
    this.publisher = await this.connection.createConfirmChannel();
    await this.publisher.assertExchange(SOURCE_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.publisher.assertExchange(CANDIDATE_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.publisher.assertQueue(CANDIDATE_QUEUE, { durable: true });
    await this.publisher.bindQueue(
      CANDIDATE_QUEUE,
      CANDIDATE_EXCHANGE,
      'matched',
    );
    this.consumer = await this.connection.createChannel();
    await this.consumer.assertQueue(SOURCE_QUEUE, { durable: true });
    await this.consumer.bindQueue(SOURCE_QUEUE, SOURCE_EXCHANGE, 'logs.events');
    await this.consumer.prefetch(5);
    // Bind the durable copy queue before loading rules so incoming logs wait here.
    await this.refreshRules();
    await this.consumer.consume(
      SOURCE_QUEUE,
      (message) => {
        void this.consume(message);
      },
      { noAck: false },
    );
    this.refreshTimer = setInterval(() => {
      void this.refreshRules().catch((error: unknown) =>
        this.logger.warn(
          `Rule refresh failed; retaining last rules: ${String(error)}`,
        ),
      );
    }, 30_000);
  }

  private async refreshRules(): Promise<void> {
    const base = this.config.get<string>('ALERTING_SERVICE_URL');
    const secret = this.config.get<string>('INTERNAL_SERVICE_SECRET');
    if (!base || !secret)
      throw new Error(
        'ALERTING_SERVICE_URL or INTERNAL_SERVICE_SECRET is not defined',
      );
    const response = await fetch(`${base}/internal/log-finding-rules`, {
      headers: { 'x-internal-service-secret': secret },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new Error(`Rule endpoint returned ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data))
      throw new Error('Rule endpoint returned invalid payload');
    if (
      !data.every(
        (rule: unknown) =>
          typeof rule === 'object' &&
          rule !== null &&
          typeof (rule as LogFindingRule).id === 'string' &&
          typeof (rule as LogFindingRule).serviceName === 'string' &&
          typeof (rule as LogFindingRule).searchQuery === 'string' &&
          Number.isInteger((rule as LogFindingRule).threshold) &&
          Number.isInteger((rule as LogFindingRule).timeWindowSeconds) &&
          Number.isInteger((rule as LogFindingRule).cooldownMinutes),
      )
    ) {
      throw new Error('Rule endpoint returned invalid rules');
    }
    this.rules = data as LogFindingRule[];
  }

  private async consume(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.consumer || !this.publisher) return;
    let batch: LogBatch;
    try {
      batch = JSON.parse(message.content.toString()) as LogBatch;
      if (typeof batch.projectId !== 'string' || !Array.isArray(batch.events)) {
        throw new Error('Invalid log batch');
      }
    } catch (error) {
      this.logger.warn(
        `Discarding invalid log finding batch: ${String(error)}`,
      );
      this.consumer.nack(message, false, false);
      return;
    }
    try {
      for (const log of batch.events) {
        if (
          !log ||
          typeof log.eventId !== 'string' ||
          typeof log.source !== 'string' ||
          typeof log.timestamp !== 'string'
        )
          continue;
        for (const rule of this.rules) {
          const candidate = matchLogFinding(rule, log, batch.projectId);
          if (!candidate) continue;
          this.publisher.publish(
            CANDIDATE_EXCHANGE,
            'matched',
            Buffer.from(JSON.stringify(candidate)),
            {
              persistent: true,
              contentType: 'application/json',
              messageId: candidate.candidateId,
            },
          );
        }
      }
      await this.publisher.waitForConfirms();
      this.consumer.ack(message);
    } catch (error) {
      this.logger.error(
        `Log finding publish failed; retrying batch: ${String(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.consumer.nack(message, false, true);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    await this.consumer?.close();
    await this.publisher?.close();
    await this.connection?.close();
  }
}

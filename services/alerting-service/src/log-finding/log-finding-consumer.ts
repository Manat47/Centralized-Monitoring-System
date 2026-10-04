import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import {
  LogFindingBuffer,
  type LogFindingCandidate,
} from './log-finding-buffer';

const EXCHANGE = 'log.finding.events';
const QUEUE = 'log_finding_events';

@Injectable()
export class LogFindingConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogFindingConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly config: ConfigService,
    private readonly buffer: LogFindingBuffer,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) throw new Error('RABBITMQ_URL is not defined');
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE, 'direct', { durable: true });
    await this.channel.assertQueue(QUEUE, { durable: true });
    await this.channel.bindQueue(QUEUE, EXCHANGE, 'matched');
    await this.channel.prefetch(20);
    await this.channel.consume(QUEUE, (message) => this.consume(message), {
      noAck: false,
    });
  }

  private consume(message: ConsumeMessage | null): void {
    if (!message || !this.channel) return;
    try {
      const candidate = JSON.parse(
        message.content.toString(),
      ) as LogFindingCandidate;
      this.buffer.record(candidate);
      this.channel.ack(message);
    } catch (error) {
      this.logger.warn(
        `Discarding invalid log finding candidate: ${String(error)}`,
      );
      this.channel.nack(message, false, false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import type { LogFindingAlertEvent } from './log-finding-event';

const EXCHANGE = 'notification.events';
const PATTERN = 'notification.log.finding';

@Injectable()
export class LogFindingEventPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL');
    const queue = this.config.get<string>('RABBITMQ_NOTIFICATION_QUEUE');
    if (!url || !queue)
      throw new Error('RabbitMQ notification configuration is incomplete');
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(EXCHANGE, 'direct', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, EXCHANGE, PATTERN);
  }

  async publish(event: LogFindingAlertEvent): Promise<void> {
    if (!this.channel) throw new Error('Log finding publisher is unavailable');
    this.channel.publish(
      EXCHANGE,
      PATTERN,
      Buffer.from(JSON.stringify({ pattern: PATTERN, data: event })),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
      },
    );
    await this.channel.waitForConfirms();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

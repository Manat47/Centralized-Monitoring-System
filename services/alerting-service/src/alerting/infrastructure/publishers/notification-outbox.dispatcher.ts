import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { notificationOutbox } from '../../../database/schema/alerts.schema';
import * as schema from '../../../database/schema/alerts.schema';
import {
  NOTIFICATION_EVENT_PUBLISHER,
  type NotificationEventPublisher,
} from '../../domain/port/notification-event-publisher.port';

@Injectable()
export class NotificationOutboxDispatcher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationOutboxDispatcher.name);
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly publisher: NotificationEventPublisher,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => void this.dispatch(), 5_000);
    void this.dispatch();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async dispatch(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let sent = 0; sent < 20; sent += 1) {
        const dispatched = await this.db.transaction(async (tx) => {
          const [row] = await tx
            .select()
            .from(notificationOutbox)
            .where(isNull(notificationOutbox.publishedAt))
            .orderBy(notificationOutbox.createdAt)
            .limit(1)
            .for('update', { skipLocked: true });

          if (!row) return false;
          await this.publisher.publish(row.payload);
          await tx
            .update(notificationOutbox)
            .set({ publishedAt: new Date() })
            .where(eq(notificationOutbox.eventId, row.eventId));
          return true;
        });
        if (!dispatched) break;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown outbox error';
      this.logger.error(`Failed to dispatch notification outbox: ${message}`);
    } finally {
      this.running = false;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import {
  notificationRecipients,
  type NotificationRecipientRow,
} from '../../../database/schema/notification-recipients.schema';
import * as schema from '../../../database/schema/notification-recipients.schema';

import { NotificationRecipient } from '../../domain/entities/notification-recipient.entity';
import type { NotificationRecipientRepository } from '../../domain/ports/notification-recipient.repository';

@Injectable()
export class DrizzleNotificationRecipientRepository implements NotificationRecipientRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(): Promise<NotificationRecipient[]> {
    const rows = await this.db
      .select()
      .from(notificationRecipients)
      .where(
        and(
          eq(notificationRecipients.channel, 'email'),
          isNotNull(notificationRecipients.email),
        ),
      )
      .orderBy(notificationRecipients.email);

    return rows.map((row) => this.toDomain(row));
  }

  async replaceAll(recipients: NotificationRecipient[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(notificationRecipients)
        .where(eq(notificationRecipients.channel, 'email'));

      if (recipients.length === 0) {
        return;
      }

      await tx.insert(notificationRecipients).values(
        recipients.map((recipient) => {
          const data = recipient.toObject();

          return {
            recipientId: data.recipientId,
            email: data.email,
            channel: 'email' as const,
            name: data.email,
            destination: data.email,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }),
      );
    });
  }

  private toDomain(row: NotificationRecipientRow): NotificationRecipient {
    if (!row.email) {
      throw new Error('Email recipient is missing an email address');
    }

    return NotificationRecipient.restore({
      recipientId: row.recipientId,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

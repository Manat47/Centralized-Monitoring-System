import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { notificationRecipients } from '../../../database/schema/notification-recipients.schema';
import { notificationSettings } from '../../../database/schema/notification-settings.schema';
import * as recipientSchema from '../../../database/schema/notification-recipients.schema';
import * as settingsSchema from '../../../database/schema/notification-settings.schema';
import type {
  NotificationSettingsRecord,
  NotificationSettingsRecipientRecord,
  NotificationSettingsRepository,
} from '../../domain/ports/notification-settings.repository';

type DatabaseSchema = typeof recipientSchema & typeof settingsSchema;

function sameRecipient(
  left: NotificationSettingsRecipientRecord,
  right: NotificationSettingsRecipientRecord,
): boolean {
  return (
    left.email === right.email &&
    left.channel === right.channel &&
    left.name === right.name &&
    left.destination === right.destination &&
    left.secretToken === right.secretToken &&
    left.isEnabled === right.isEnabled &&
    left.priority === right.priority
  );
}

@Injectable()
export class DrizzleNotificationSettingsRepository implements NotificationSettingsRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<DatabaseSchema>,
  ) {}

  async get(): Promise<NotificationSettingsRecord> {
    const [settings, recipients] = await Promise.all([
      this.db
        .select({ isFallbackEnabled: notificationSettings.isFallbackEnabled })
        .from(notificationSettings)
        .where(eq(notificationSettings.id, 'global'))
        .limit(1),
      this.db
        .select()
        .from(notificationRecipients)
        .orderBy(notificationRecipients.createdAt),
    ]);

    return {
      isFallbackEnabled: settings[0]?.isFallbackEnabled ?? false,
      recipients,
    };
  }

  async mutate(
    change: (current: NotificationSettingsRecord) => NotificationSettingsRecord,
  ): Promise<NotificationSettingsRecord> {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(notificationSettings)
        .values({ id: 'global', isFallbackEnabled: false })
        .onConflictDoNothing();
      // Serialize settings mutations before reading the recipient snapshot.
      const settingsRows = await tx
        .select({ isFallbackEnabled: notificationSettings.isFallbackEnabled })
        .from(notificationSettings)
        .where(eq(notificationSettings.id, 'global'))
        .for('update');
      const recipients = await tx
        .select()
        .from(notificationRecipients)
        .orderBy(notificationRecipients.createdAt);
      const current: NotificationSettingsRecord = {
        isFallbackEnabled: settingsRows[0].isFallbackEnabled,
        recipients,
      };
      const next = change(current);
      const currentById = new Map(
        current.recipients.map((recipient) => [
          recipient.recipientId,
          recipient,
        ]),
      );
      const nextById = new Map(
        next.recipients.map((recipient) => [recipient.recipientId, recipient]),
      );

      const removedOrEmailChanged = current.recipients
        .filter((recipient) => {
          const replacement = nextById.get(recipient.recipientId);
          return !replacement || recipient.email !== replacement.email;
        })
        .map((recipient) => recipient.recipientId);
      if (removedOrEmailChanged.length > 0) {
        // Release the unique email values before inserting changed addresses.
        await tx
          .delete(notificationRecipients)
          .where(
            inArray(notificationRecipients.recipientId, removedOrEmailChanged),
          );
      }

      for (const recipient of next.recipients) {
        const previous = currentById.get(recipient.recipientId);
        if (
          !previous ||
          previous.email !== recipient.email ||
          sameRecipient(previous, recipient)
        ) {
          continue;
        }
        await tx
          .update(notificationRecipients)
          .set({
            channel: recipient.channel,
            name: recipient.name,
            destination: recipient.destination,
            secretToken: recipient.secretToken,
            isEnabled: recipient.isEnabled,
            priority: recipient.priority,
            updatedAt: recipient.updatedAt,
          })
          .where(eq(notificationRecipients.recipientId, recipient.recipientId));
      }

      const insertedOrEmailChanged = next.recipients.filter((recipient) => {
        const previous = currentById.get(recipient.recipientId);
        return !previous || previous.email !== recipient.email;
      });
      if (insertedOrEmailChanged.length > 0) {
        await tx.insert(notificationRecipients).values(insertedOrEmailChanged);
      }
      if (next.isFallbackEnabled !== current.isFallbackEnabled) {
        await tx
          .update(notificationSettings)
          .set({
            isFallbackEnabled: next.isFallbackEnabled,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.id, 'global'));
      }
      return next;
    });
  }

  async findRecipient(recipientId: string) {
    const rows = await this.db
      .select()
      .from(notificationRecipients)
      .where(eq(notificationRecipients.recipientId, recipientId))
      .limit(1);
    return rows[0] ?? null;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { notificationRecipients } from '../../../database/schema/notification-recipients.schema';
import { notificationSettings } from '../../../database/schema/notification-settings.schema';
import * as recipientSchema from '../../../database/schema/notification-recipients.schema';
import * as settingsSchema from '../../../database/schema/notification-settings.schema';
import type {
  NotificationSettingsRecord,
  NotificationSettingsRepository,
} from '../../domain/ports/notification-settings.repository';

type DatabaseSchema = typeof recipientSchema & typeof settingsSchema;

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

  async replace(
    settings: NotificationSettingsRecord,
  ): Promise<NotificationSettingsRecord> {
    await this.db.transaction(async (tx) => {
      await tx.delete(notificationRecipients);
      if (settings.recipients.length > 0) {
        await tx.insert(notificationRecipients).values(settings.recipients);
      }
      await tx
        .insert(notificationSettings)
        .values({ id: 'global', isFallbackEnabled: settings.isFallbackEnabled })
        .onConflictDoUpdate({
          target: notificationSettings.id,
          set: {
            isFallbackEnabled: settings.isFallbackEnabled,
            updatedAt: new Date(),
          },
        });
    });
    return this.get();
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

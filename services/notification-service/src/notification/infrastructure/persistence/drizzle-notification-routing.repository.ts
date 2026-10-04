import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { notificationRecipients } from '../../../database/schema/notification-recipients.schema';
import { notificationSettings } from '../../../database/schema/notification-settings.schema';
import * as recipientSchema from '../../../database/schema/notification-recipients.schema';
import * as settingsSchema from '../../../database/schema/notification-settings.schema';
import type {
  NotificationRoutingConfiguration,
  NotificationRoutingRepository,
} from '../../domain/ports/notification-routing.repository';

type DatabaseSchema = typeof recipientSchema & typeof settingsSchema;

@Injectable()
export class DrizzleNotificationRoutingRepository implements NotificationRoutingRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<DatabaseSchema>,
  ) {}

  async getConfiguration(): Promise<NotificationRoutingConfiguration> {
    const [settings, recipients] = await Promise.all([
      this.db
        .select({ isFallbackEnabled: notificationSettings.isFallbackEnabled })
        .from(notificationSettings)
        .where(eq(notificationSettings.id, 'global'))
        .limit(1),
      this.db
        .select({
          recipientId: notificationRecipients.recipientId,
          channel: notificationRecipients.channel,
          name: notificationRecipients.name,
          destination: notificationRecipients.destination,
          secretToken: notificationRecipients.secretToken,
          priority: notificationRecipients.priority,
        })
        .from(notificationRecipients)
        .where(eq(notificationRecipients.isEnabled, true))
        .orderBy(
          sql`${notificationRecipients.priority} asc nulls last`,
          asc(notificationRecipients.createdAt),
          asc(notificationRecipients.recipientId),
        ),
    ]);

    return {
      isFallbackEnabled: settings[0]?.isFallbackEnabled ?? false,
      recipients,
    };
  }
}

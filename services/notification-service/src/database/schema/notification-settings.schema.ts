import { boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const notificationSettings = pgTable('notification_settings', {
  id: varchar('id', { length: 64 }).primaryKey(),
  isFallbackEnabled: boolean('is_fallback_enabled').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type NotificationSettingsRow = typeof notificationSettings.$inferSelect;

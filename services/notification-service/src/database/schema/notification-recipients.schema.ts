import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const notificationRecipients = pgTable('notification_recipients', {
  recipientId: uuid('recipient_id').primaryKey(),

  email: text('email').notNull().unique(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
});

export type NotificationRecipientRow =
  typeof notificationRecipients.$inferSelect;

export type NewNotificationRecipientRow =
  typeof notificationRecipients.$inferInsert;

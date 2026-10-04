import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    recipientId: uuid('recipient_id').primaryKey(),
    // Retained for the existing email-only API and its unique constraint.
    email: text('email').unique(),
    channel: varchar('channel', { length: 16 })
      .$type<'email' | 'line' | 'slack' | 'webhook'>()
      .default('email')
      .notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    destination: text('destination').notNull(),
    secretToken: text('secret_token'),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    priority: integer('priority'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'notification_recipients_channel_check',
      sql`${table.channel} in ('email', 'line', 'slack', 'webhook')`,
    ),
    check(
      'notification_recipients_email_check',
      sql`${table.channel} <> 'email' or ${table.email} is not null`,
    ),
    check(
      'notification_recipients_priority_check',
      sql`${table.priority} is null or ${table.priority} > 0`,
    ),
  ],
);

export type NotificationRecipientRow =
  typeof notificationRecipients.$inferSelect;

export type NewNotificationRecipientRow =
  typeof notificationRecipients.$inferInsert;

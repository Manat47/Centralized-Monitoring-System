import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    sessionId: uuid('session_id').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, {
        onDelete: 'cascade',
      }),

    tokenHash: text('token_hash').notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    }).notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index('refresh_sessions_user_id_idx').on(table.userId),

    index('refresh_sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export type RefreshSessionRow = typeof refreshSessions.$inferSelect;

export type NewRefreshSessionRow = typeof refreshSessions.$inferInsert;

import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'OPERATOR']);

export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE']);

export const users = pgTable('users', {
  userId: uuid('user_id').primaryKey(),

  email: text('email').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  displayName: text('display_name').notNull(),

  role: userRoleEnum('role').notNull(),

  status: userStatusEnum('status').notNull(),

  lastLoginAt: timestamp('last_login_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

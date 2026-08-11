import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  auditLogId: uuid('audit_log_id').primaryKey(),

  actorUserId: uuid('actor_user_id').notNull(),
  actorRole: text('actor_role').notNull(),

  action: text('action').notNull(),

  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),

  result: text('result').notNull(),

  occurredAt: timestamp('occurred_at', {
    withTimezone: true,
  }).notNull(),
});

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

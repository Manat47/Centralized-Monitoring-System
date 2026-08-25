import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const auditLogs = pgTable(
  'audit_logs',
  {
    auditLogId: uuid('audit_log_id').primaryKey(),
    eventId: uuid('event_id').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),

    actorUserId: uuid('actor_user_id').notNull(),
    actorRole: text('actor_role').notNull(),
    actorEmail: text('actor_email'),

    action: text('action').notNull(),

    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    resourceName: text('resource_name'),

    result: text('result').notNull(),
    sourceService: text('source_service').notNull(),
    requestId: text('request_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),

    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
    }).notNull(),
    ingestedAt: timestamp('ingested_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('audit_logs_event_id_idx').on(table.eventId),
    index('audit_logs_occurred_at_idx').on(table.occurredAt),
    index('audit_logs_action_occurred_at_idx').on(
      table.action,
      table.occurredAt,
    ),
    index('audit_logs_resource_occurred_at_idx').on(
      table.resourceType,
      table.resourceId,
      table.occurredAt,
    ),
    index('audit_logs_actor_occurred_at_idx').on(
      table.actorUserId,
      table.occurredAt,
    ),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const alertStatusEnum = pgEnum('alert_status', [
  'TRIGGERED',
  'ACKNOWLEDGED',
  'RESOLVED',
  'CLOSED',
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'WARNING',
  'CRITICAL',
]);

export const alerts = pgTable(
  'alerts',
  {
    alertId: uuid('alert_id').primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    alertType: text('alert_type').notNull(),
    dedupKey: text('dedup_key').notNull(),
    ruleId: uuid('rule_id'),
    assetId: uuid('asset_id').notNull(),
    metricType: text('metric_type').notNull(),
    severity: alertSeverityEnum('severity').notNull(),
    status: alertStatusEnum('status').notNull(),
    thresholdValue: doublePrecision('threshold_value'),
    actualValue: doublePrecision('actual_value'),
    actualText: text('actual_text'),
    context: jsonb('context').$type<Record<string, unknown>>(),
    message: text('message').notNull(),
    triggeredAt: timestamp('triggered_at', {
      withTimezone: true,
    }).notNull(),
    acknowledgedAt: timestamp('acknowledged_at', {
      withTimezone: true,
    }),
    acknowledgedBy: uuid('acknowledged_by'),
    resolvedAt: timestamp('resolved_at', {
      withTimezone: true,
    }),
    resolutionReason: text('resolution_reason'),
    closedAt: timestamp('closed_at', {
      withTimezone: true,
    }),
    closedBy: uuid('closed_by'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    uniqueIndex('alerts_active_dedup_key_unique')
      .on(table.dedupKey)
      .where(sql`${table.status} in ('TRIGGERED', 'ACKNOWLEDGED')`),
    index('alerts_source_idx').on(table.sourceType, table.sourceId),
  ],
);

export type AlertRow = typeof alerts.$inferSelect;
export type NewAlertRow = typeof alerts.$inferInsert;

export const alertLifecycleEvents = pgTable(
  'alert_lifecycle_events',
  {
    lifecycleEventId: uuid('lifecycle_event_id').primaryKey(),
    alertId: uuid('alert_id').notNull(),
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    reason: text('reason'),
    context: jsonb('context').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('alert_lifecycle_events_alert_idx').on(table.alertId)],
);

export type AlertLifecycleEventRow =
  typeof alertLifecycleEvents.$inferSelect;

export const processedAlertEvents = pgTable('processed_alert_events', {
  eventId: uuid('event_id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const healthCheckAlertStates = pgTable('health_check_alert_states', {
  healthCheckTargetId: uuid('health_check_target_id').primaryKey(),
  assetId: uuid('asset_id').notNull(),
  url: text('url').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  archived: boolean('archived').default(false).notNull(),
  state: text('state').default('UNKNOWN').notNull(),
  checkIntervalSeconds: integer('check_interval_seconds').notNull(),
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  consecutiveSuccesses: integer('consecutive_successes').default(0).notNull(),
  lastResultAt: timestamp('last_result_at', { withTimezone: true }),
  lastStatusCode: integer('last_status_code'),
  lastResponseTimeMs: integer('last_response_time_ms'),
  lastError: text('last_error'),
  staleAlertedAt: timestamp('stale_alerted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type HealthCheckAlertStateRow =
  typeof healthCheckAlertStates.$inferSelect;
